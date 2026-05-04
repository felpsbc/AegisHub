from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.services import (
    LoginError,
    MFARequired,
    enable_mfa,
    login_with_password,
    logout_session,
    register_account,
    setup_mfa,
    verify_mfa,
)
from api.serializers import (
    ApplicationCreateSerializer,
    ApplicationSerializer,
    AvailabilityUpdateSerializer,
    LoginSerializer,
    MFASerializer,
    PentesterPublicSerializer,
    PentesterUpdateSerializer,
    ProposalCreateSerializer,
    ProposalSerializer,
    RegisterSerializer,
    SpecialtySerializer,
    UserMeSerializer,
)
from applications.models import Application, ApplicationStatus
from applications.services import ApplicationError, apply_to_proposal, transition
from pentesters.models import Availability, PentesterProfile, Specialty
from pentesters.services import set_availability
from proposals.models import Proposal, ProposalStatus
from proposals.services import (
    ProposalError,
    close_proposal,
    create_proposal,
    publish_proposal,
)
from tenants.models import Membership, TenantType


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


# ============ AUTH ============

class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RegisterSerializer, responses=UserMeSerializer)
    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = register_account(**ser.validated_data)
        return Response(UserMeSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

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
            Proposal.objects.select_related("tenant").prefetch_related("specialties"),
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
        return Response(ProposalSerializer(p).data)


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


# ============ CSRF ping ============

@extend_schema(responses={200: dict})
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_view(request):
    """Endpoint que define o cookie CSRF (chamado pelo BFF antes de POST)."""
    from django.middleware.csrf import get_token
    return Response({"csrfToken": get_token(request)})
