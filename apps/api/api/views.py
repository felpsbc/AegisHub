from __future__ import annotations

from django.db import IntegrityError
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.models import User
from accounts.services import (
    LoginError,
    MFARequired,
    admin_set_user_active,
    confirm_email,
    enable_mfa,
    login_with_password,
    logout_session,
    register_account,
    request_password_reset,
    resend_confirmation,
    reset_password,
    setup_mfa,
    verify_mfa,
)
from api.serializers import (
    AdminProposalSerializer,
    AdminUserActionSerializer,
    AdminUserSerializer,
    ApplicationCreateSerializer,
    ApplicationSerializer,
    AvailabilityUpdateSerializer,
    CompanyProfileSerializer,
    CompanyProfileUpdateSerializer,
    FavoriteCreateSerializer,
    FavoriteSerializer,
    LoginSerializer,
    MFASerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PentesterPublicSerializer,
    PentesterUpdateSerializer,
    ProposalCreateSerializer,
    ProposalDetailSerializer,
    ProposalSerializer,
    RegisterSerializer,
    SpecialtySerializer,
    UserMeSerializer,
)
from applications.models import Application, ApplicationStatus
from applications.services import ApplicationError, apply_to_proposal, transition
from favorites.models import FavoriteTarget
from favorites.services import (
    FavoriteError,
    add_favorite,
    list_favorites,
    remove_favorite,
)
from pentesters.models import Availability, PentesterProfile, Specialty
from pentesters.services import set_availability
from proposals.models import Proposal, ProposalStatus
from proposals.services import (
    ProposalError,
    admin_delete_proposal,
    close_proposal,
    create_proposal,
    publish_proposal,
)
from tenants.models import CompanyProfile, Membership, Tenant, TenantType
from tenants.services import update_company_profile


def _has_company_membership(user) -> bool:
    if not user.is_authenticated:
        return False
    return Membership.objects.filter(
        user=user, tenant__type=TenantType.COMPANY
    ).exists()


def _pentester_profile_for(user):
    if not user.is_authenticated:
        return None
    m = (
        Membership.objects.select_related("tenant__pentester_profile")
        .filter(user=user, tenant__type=TenantType.INDIVIDUAL)
        .first()
    )
    if not m:
        return None
    return getattr(m.tenant, "pentester_profile", None)


def _is_member_of(user, tenant) -> bool:
    if not user.is_authenticated:
        return False
    return Membership.objects.filter(user=user, tenant=tenant).exists()


def _is_admin(user) -> bool:
    return bool(user.is_authenticated and user.is_active and user.is_admin)


# ============ AUTH ============

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    @extend_schema(request=RegisterSerializer, responses=UserMeSerializer)
    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            user = register_account(**ser.validated_data)
        except IntegrityError:
            # Rede de segurança contra corrida entre a validação e o INSERT:
            # o cadastro já atômico faz rollback; aqui só traduzimos para 400.
            return Response(
                {"detail": "E-mail ou documento já cadastrado."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(UserMeSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(request=LoginSerializer, responses=UserMeSerializer)
    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            user = login_with_password(request, **ser.validated_data)
        except MFARequired:
            return Response({"mfa_required": True}, status=status.HTTP_202_ACCEPTED)
        except LoginError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserMeSerializer(user).data)


class LoginMFAView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "mfa"

    @extend_schema(request=MFASerializer, responses=UserMeSerializer)
    def post(self, request):
        ser = MFASerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            user = verify_mfa(request, **ser.validated_data)
        except LoginError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserMeSerializer(user).data)


class LogoutView(APIView):
    @extend_schema(responses={204: None})
    def post(self, request):
        logout_session(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    @extend_schema(responses=UserMeSerializer)
    def get(self, request):
        return Response(UserMeSerializer(request.user).data)


class MFASetupView(APIView):
    @extend_schema(responses={200: dict})
    def post(self, request):
        secret, backup_codes = setup_mfa(request.user)
        return Response({"secret": secret, "backup_codes": backup_codes})


class MFAEnableView(APIView):
    @extend_schema(request=MFASerializer, responses={204: None})
    def post(self, request):
        ser = MFASerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            enable_mfa(request.user, **ser.validated_data)
        except LoginError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmailConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: dict, 400: dict})
    def post(self, request, uidb64, token):
        try:
            confirm_email(uidb64=uidb64, token=token)
        except LoginError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "email_confirmed"})


class EmailResendView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={202: None})
    def post(self, request):
        email = (request.data or {}).get("email")
        if email:
            resend_confirmation(email=email)
        return Response(status=status.HTTP_202_ACCEPTED)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    @extend_schema(request=PasswordResetRequestSerializer, responses={202: None})
    def post(self, request):
        ser = PasswordResetRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        # Resposta 202 incondicional: não confirma nem nega a existência do e-mail.
        request_password_reset(**ser.validated_data)
        return Response(status=status.HTTP_202_ACCEPTED)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: dict, 400: dict})
    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            reset_password(**ser.validated_data)
        except LoginError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "password_reset"})


# ============ ADMIN ============
# Gates inline (mesma dívida técnica das demais views — ver ONBOARDING). Todo
# endpoint admin exige is_admin; non-admin recebe 403 sem vazar dados.

class _AdminView(APIView):
    """Base: 403 para qualquer não-admin antes de tocar no handler."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not _is_admin(request.user):
            self.permission_denied(request, message="admin_only")


class AdminStatsView(_AdminView):
    @extend_schema(responses={200: dict})
    def get(self, request):
        return Response({
            "users_total": User.objects.count(),
            "users_active": User.objects.filter(is_active=True).count(),
            "companies": Tenant.objects.filter(type=TenantType.COMPANY).count(),
            "pentesters": Tenant.objects.filter(type=TenantType.INDIVIDUAL).count(),
            "proposals_total": Proposal.objects.count(),
            "proposals_published": Proposal.objects.filter(
                status=ProposalStatus.PUBLISHED
            ).count(),
            "applications_total": Application.objects.count(),
        })


class AdminUserListView(_AdminView):
    @extend_schema(responses=AdminUserSerializer(many=True))
    def get(self, request):
        qs = User.objects.prefetch_related("memberships__tenant").order_by("-created_at")
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(Q(email__icontains=q) | Q(full_name__icontains=q))
        return Response(AdminUserSerializer(qs[:200], many=True).data)


class AdminUserActionView(_AdminView):
    @extend_schema(request=AdminUserActionSerializer, responses=AdminUserSerializer)
    def post(self, request, public_id):
        user = get_object_or_404(User, public_id=public_id)
        ser = AdminUserActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            admin_set_user_active(
                user=user, active=ser.validated_data["active"], actor=request.user
            )
        except LoginError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        return Response(AdminUserSerializer(user).data)


class AdminProposalListView(_AdminView):
    @extend_schema(responses=AdminProposalSerializer(many=True))
    def get(self, request):
        qs = (
            Proposal.objects.select_related("tenant")
            .annotate(applications_count=Count("applications"))
            .order_by("-created_at")
        )
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(tenant__legal_name__icontains=q))
        return Response(AdminProposalSerializer(qs[:200], many=True).data)


class AdminProposalDeleteView(_AdminView):
    @extend_schema(responses={204: None})
    def delete(self, request, public_id):
        proposal = get_object_or_404(Proposal, public_id=public_id)
        admin_delete_proposal(proposal, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============ TAXONOMIES ============

class SpecialtyListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=SpecialtySerializer(many=True))
    def get(self, request):
        return Response(SpecialtySerializer(Specialty.objects.all(), many=True).data)


# ============ PENTESTERS ============

class PentesterListView(APIView):
    @extend_schema(responses=PentesterPublicSerializer(many=True))
    def get(self, request):
        if not _has_company_membership(request.user):
            return Response(
                {"detail": "only_companies_can_browse_pentesters"},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = PentesterProfile.objects.filter(
            availability=Availability.OPEN
        ).select_related("tenant").prefetch_related("specialties", "certifications__certification")
        specialty = request.query_params.get("specialty")
        if specialty:
            qs = qs.filter(specialties__code=specialty)
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(Q(headline__icontains=q) | Q(bio__icontains=q))
        try:
            min_rate = request.query_params.get("min_rate")
            if min_rate:
                qs = qs.filter(hourly_rate__gte=min_rate)
            max_rate = request.query_params.get("max_rate")
            if max_rate:
                qs = qs.filter(hourly_rate__lte=max_rate)
        except (ValueError, TypeError):
            pass
        qs = qs.order_by("-rating_avg", "hourly_rate")[:60]
        return Response(PentesterPublicSerializer(qs, many=True).data)


class PentesterDetailView(APIView):
    @extend_schema(responses=PentesterPublicSerializer)
    def get(self, request, public_id):
        p = get_object_or_404(
            PentesterProfile.objects.select_related("tenant").prefetch_related(
                "specialties", "certifications__certification"
            ),
            public_id=public_id,
        )
        if not (_has_company_membership(request.user) or _is_member_of(request.user, p.tenant)):
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return Response(PentesterPublicSerializer(p).data)

    @extend_schema(request=PentesterUpdateSerializer, responses=PentesterPublicSerializer)
    def patch(self, request, public_id):
        p = get_object_or_404(PentesterProfile, public_id=public_id)
        if not Membership.objects.filter(user=request.user, tenant=p.tenant).exists():
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        ser = PentesterUpdateSerializer(p, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(PentesterPublicSerializer(p).data)


class PentesterAvailabilityView(APIView):
    @extend_schema(request=AvailabilityUpdateSerializer, responses={204: None})
    def patch(self, request, public_id):
        p = get_object_or_404(PentesterProfile, public_id=public_id)
        if not Membership.objects.filter(user=request.user, tenant=p.tenant).exists():
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        ser = AvailabilityUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        set_availability(p, ser.validated_data["availability"], actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============ COMPANY PROFILE ============

class CompanyProfileView(APIView):
    """Perfil da empresa autenticada. GET lê, PATCH edita (só membros do tenant)."""

    def _company_tenant(self, user) -> Tenant | None:
        m = (
            Membership.objects.select_related("tenant__company_profile")
            .filter(user=user, tenant__type=TenantType.COMPANY)
            .first()
        )
        return m.tenant if m else None

    @extend_schema(responses=CompanyProfileSerializer)
    def get(self, request):
        tenant = self._company_tenant(request.user)
        if tenant is None:
            return Response({"detail": "only_companies"}, status=status.HTTP_403_FORBIDDEN)
        profile, _ = CompanyProfile.objects.get_or_create(tenant=tenant)
        return Response(CompanyProfileSerializer(profile).data)

    @extend_schema(request=CompanyProfileUpdateSerializer, responses=CompanyProfileSerializer)
    def patch(self, request):
        tenant = self._company_tenant(request.user)
        if tenant is None:
            return Response({"detail": "only_companies"}, status=status.HTTP_403_FORBIDDEN)
        ser = CompanyProfileUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        profile = update_company_profile(
            tenant=tenant, actor=request.user, **ser.validated_data
        )
        return Response(CompanyProfileSerializer(profile).data)


# ============ PROPOSALS ============

class ProposalListView(APIView):
    @extend_schema(responses=ProposalSerializer(many=True))
    def get(self, request):
        # Feed PUBLISHED só para pentesters cadastrados; empresas veem só as próprias via ?mine=1.
        mine = request.query_params.get("mine") == "1"
        if mine:
            tenant_ids = Membership.objects.filter(user=request.user).values_list(
                "tenant_id", flat=True
            )
            qs = Proposal.objects.filter(tenant_id__in=tenant_ids)
        else:
            if _pentester_profile_for(request.user) is None:
                return Response(
                    {"detail": "only_pentesters_can_browse_proposals"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            qs = Proposal.objects.filter(status=ProposalStatus.PUBLISHED)
        specialty = request.query_params.get("specialty")
        if specialty:
            qs = qs.filter(specialties__code=specialty)
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
        qs = qs.select_related("tenant").prefetch_related("specialties").order_by(
            "-published_at", "-created_at"
        )[:60]
        return Response(ProposalSerializer(qs, many=True).data)

    @extend_schema(request=ProposalCreateSerializer, responses=ProposalSerializer)
    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "auth_required"}, status=401)
        m = (
            Membership.objects.select_related("tenant")
            .filter(user=request.user, tenant__type=TenantType.COMPANY)
            .first()
        )
        if not m:
            return Response({"detail": "only_companies"}, status=status.HTTP_403_FORBIDDEN)
        ser = ProposalCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        b = ser.validated_data["budget"]
        try:
            proposal = create_proposal(
                tenant=m.tenant,
                actor=request.user,
                title=ser.validated_data["title"],
                description=ser.validated_data["description"],
                scope_md=ser.validated_data["scope_md"],
                budget_kind=b["kind"],
                budget_amount=b.get("amount"),
                budget_currency=b.get("currency", "BRL"),
                duration_weeks=ser.validated_data.get("duration_weeks"),
                visibility=ser.validated_data["visibility"],
                specialty_ids=[s.id for s in ser.validated_data.get("specialties", [])],
            )
        except ProposalError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProposalSerializer(proposal).data, status=status.HTTP_201_CREATED)


class ProposalDetailView(APIView):
    @extend_schema(responses=ProposalSerializer)
    def get(self, request, public_id):
        p = get_object_or_404(
            Proposal.objects.select_related("tenant__company_profile").prefetch_related(
                "specialties"
            ),
            public_id=public_id,
        )
        is_owner = _is_member_of(request.user, p.tenant)
        if p.status == ProposalStatus.PUBLISHED:
            # Conteúdo completo só para pentester cadastrado ou para o próprio dono.
            if not is_owner and _pentester_profile_for(request.user) is None:
                return Response({"detail": "not_found"}, status=404)
        else:
            # Drafts/closed/archived — só dono.
            if not is_owner:
                return Response({"detail": "not_found"}, status=404)
        return Response(ProposalDetailSerializer(p).data)


class ProposalPublishView(APIView):
    @extend_schema(responses=ProposalSerializer)
    def post(self, request, public_id):
        p = get_object_or_404(Proposal, public_id=public_id)
        if not Membership.objects.filter(user=request.user, tenant=p.tenant).exists():
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        try:
            publish_proposal(p, actor=request.user)
        except ProposalError as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)
        return Response(ProposalSerializer(p).data)


class ProposalCloseView(APIView):
    @extend_schema(responses=ProposalSerializer)
    def post(self, request, public_id):
        p = get_object_or_404(Proposal, public_id=public_id)
        if not Membership.objects.filter(user=request.user, tenant=p.tenant).exists():
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        try:
            close_proposal(p, actor=request.user)
        except ProposalError as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)
        return Response(ProposalSerializer(p).data)


# ============ APPLICATIONS ============

class ApplicationCreateView(APIView):
    @extend_schema(request=ApplicationCreateSerializer, responses=ApplicationSerializer)
    def post(self, request, public_id):
        proposal = get_object_or_404(Proposal, public_id=public_id)
        m = (
            Membership.objects.select_related("tenant")
            .filter(user=request.user, tenant__type=TenantType.INDIVIDUAL)
            .first()
        )
        if not m or not hasattr(m.tenant, "pentester_profile"):
            return Response({"detail": "no_pentester_profile"}, status=status.HTTP_403_FORBIDDEN)
        ser = ApplicationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            app = apply_to_proposal(
                proposal=proposal,
                pentester=m.tenant.pentester_profile,
                actor=request.user,
                **ser.validated_data,
            )
        except ApplicationError as e:
            code = status.HTTP_409_CONFLICT if "already" in str(e) else status.HTTP_400_BAD_REQUEST
            return Response({"detail": str(e)}, status=code)
        return Response(ApplicationSerializer(app).data, status=status.HTTP_201_CREATED)


class ApplicationListMineView(APIView):
    @extend_schema(responses=ApplicationSerializer(many=True))
    def get(self, request):
        m = (
            Membership.objects.select_related("tenant")
            .filter(user=request.user, tenant__type=TenantType.INDIVIDUAL)
            .first()
        )
        if not m or not hasattr(m.tenant, "pentester_profile"):
            return Response([])
        qs = (
            Application.objects.select_related("proposal", "pentester__tenant")
            .filter(pentester=m.tenant.pentester_profile)
            .order_by("-created_at")
        )
        return Response(ApplicationSerializer(qs, many=True).data)


class ApplicationListByProposalView(APIView):
    @extend_schema(responses=ApplicationSerializer(many=True))
    def get(self, request, public_id):
        proposal = get_object_or_404(Proposal, public_id=public_id)
        if not Membership.objects.filter(user=request.user, tenant=proposal.tenant).exists():
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        qs = (
            Application.objects.select_related("pentester__tenant")
            .filter(proposal=proposal)
            .order_by("-created_at")
        )
        return Response(ApplicationSerializer(qs, many=True).data)


class ApplicationActionView(APIView):
    """Endpoint genérico para shortlist/accept/reject/withdraw."""

    @extend_schema(responses=ApplicationSerializer)
    def post(self, request, public_id, action):
        app = get_object_or_404(Application.objects.select_related("proposal", "pentester__tenant"), public_id=public_id)
        action_map = {
            "shortlist": (ApplicationStatus.SHORTLISTED, "company"),
            "accept": (ApplicationStatus.ACCEPTED, "company"),
            "reject": (ApplicationStatus.REJECTED, "company"),
            "withdraw": (ApplicationStatus.WITHDRAWN, "pentester"),
        }
        if action not in action_map:
            return Response({"detail": "unknown_action"}, status=400)
        new_status, who = action_map[action]
        target_tenant = app.proposal.tenant if who == "company" else app.pentester.tenant
        if not Membership.objects.filter(user=request.user, tenant=target_tenant).exists():
            return Response({"detail": "forbidden"}, status=status.HTTP_403_FORBIDDEN)
        try:
            transition(app, to=new_status, actor=request.user)
        except ApplicationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)
        return Response(ApplicationSerializer(app).data)


# ============ FAVORITES ============


class FavoriteListCreateView(APIView):
    @extend_schema(responses=FavoriteSerializer(many=True))
    def get(self, request):
        target_type = request.query_params.get("type")
        try:
            qs = list_favorites(user=request.user, target_type=target_type)
        except FavoriteError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(FavoriteSerializer(qs, many=True).data)

    @extend_schema(request=FavoriteCreateSerializer, responses=FavoriteSerializer)
    def post(self, request):
        ser = FavoriteCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        target_type = ser.validated_data["target_type"]
        target_uuid = ser.validated_data["target_id"]

        # Valida que o alvo existe — evita guardar bookmarks órfãos.
        if target_type == FavoriteTarget.PENTESTER:
            if not PentesterProfile.objects.filter(public_id=target_uuid).exists():
                return Response({"detail": "target_not_found"}, status=status.HTTP_404_NOT_FOUND)
        elif target_type == FavoriteTarget.PROPOSAL:
            if not Proposal.objects.filter(public_id=target_uuid).exists():
                return Response({"detail": "target_not_found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            fav = add_favorite(user=request.user, target_type=target_type, target_uuid=target_uuid)
        except FavoriteError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(FavoriteSerializer(fav).data, status=status.HTTP_201_CREATED)


class FavoriteDeleteView(APIView):
    @extend_schema(responses={204: None})
    def delete(self, request, public_id):
        try:
            remove_favorite(user=request.user, public_id=public_id)
        except FavoriteError:
            return Response({"detail": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============ CSRF ping ============

@extend_schema(responses={200: dict})
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_view(request):
    """Endpoint que define o cookie CSRF (chamado pelo BFF antes de POST)."""
    from django.middleware.csrf import get_token
    return Response({"csrfToken": get_token(request)})
