from __future__ import annotations

from rest_framework import serializers

from accounts.models import User
from applications.models import Application
from favorites.models import Favorite, FavoriteTarget
from pentesters.models import (
    Availability,
    Certification,
    PentesterCertification,
    PentesterProfile,
    Specialty,
)
from proposals.models import BudgetKind, Proposal, ProposalStatus, ProposalVisibility
from tenants.models import (
    CompanyProfile,
    DocumentKind,
    Membership,
    Tenant,
    TenantStatus,
    TenantType,
)


# --- Company profile ---

class CompanyProfileSerializer(serializers.ModelSerializer):
    """Projeção pública do perfil da empresa (lida por pentesters)."""

    class Meta:
        model = CompanyProfile
        fields = [
            "summary", "about", "website", "industry",
            "location", "size", "founded_year",
        ]


class CompanyProfileUpdateSerializer(serializers.Serializer):
    summary = serializers.CharField(max_length=200, allow_blank=True, required=False)
    about = serializers.CharField(max_length=8000, allow_blank=True, required=False)
    website = serializers.URLField(max_length=200, allow_blank=True, required=False)
    industry = serializers.CharField(max_length=120, allow_blank=True, required=False)
    location = serializers.CharField(max_length=120, allow_blank=True, required=False)
    size = serializers.CharField(max_length=40, allow_blank=True, required=False)
    founded_year = serializers.IntegerField(
        required=False, allow_null=True, min_value=1800, max_value=2100
    )


# --- Auth / User ---

class TenantSummarySerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    company_profile = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = ["id", "type", "legal_name", "status", "company_profile"]

    def get_company_profile(self, obj):
        if obj.type != TenantType.COMPANY:
            return None
        prof = getattr(obj, "company_profile", None)
        return CompanyProfileSerializer(prof).data if prof else None


class MembershipSerializer(serializers.ModelSerializer):
    tenant = TenantSummarySerializer(read_only=True)
    pentester_profile_id = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ["tenant", "role", "pentester_profile_id"]

    def get_pentester_profile_id(self, obj):
        if obj.tenant.type != TenantType.INDIVIDUAL:
            return None
        prof = getattr(obj.tenant, "pentester_profile", None)
        return str(prof.public_id) if prof else None


class UserMeSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    memberships = MembershipSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "is_admin",
            "mfa_enabled",
            "email_confirmed_at",
            "memberships",
        ]


# --- Auth in/out ---

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(min_length=12, max_length=128, write_only=True)
    full_name = serializers.CharField(max_length=200)
    tenant_type = serializers.ChoiceField(choices=TenantType.choices)
    legal_name = serializers.CharField(max_length=200)
    document = serializers.CharField(max_length=20)
    document_kind = serializers.ChoiceField(choices=DocumentKind.choices)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, write_only=True)


class MFASerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=16)


# --- Pentesters ---

class SpecialtySerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = ["id", "code", "label"]


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ["id", "code", "label"]


class PentesterCertificationSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source="certification.code", read_only=True)
    label = serializers.CharField(source="certification.label", read_only=True)

    class Meta:
        model = PentesterCertification
        fields = ["code", "label", "issued_at", "expires_at", "verification", "verified_at"]


class PentesterPublicSerializer(serializers.ModelSerializer):
    """Projeção pública: nunca expõe documento ou e-mail."""

    id = serializers.UUIDField(source="public_id", read_only=True)
    legal_name = serializers.CharField(source="tenant.legal_name", read_only=True)
    specialties = SpecialtySerializer(many=True, read_only=True)
    certifications = PentesterCertificationSerializer(many=True, read_only=True)

    class Meta:
        model = PentesterProfile
        fields = [
            "id", "legal_name", "headline", "bio", "hourly_rate", "currency",
            "availability", "location", "remote_only", "rating_avg", "rating_count",
            "verified_at", "specialties", "certifications",
        ]


class PentesterUpdateSerializer(serializers.ModelSerializer):
    specialties = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Specialty.objects.all(), required=False
    )
    bio = serializers.CharField(max_length=4000, allow_blank=True, required=False)

    class Meta:
        model = PentesterProfile
        fields = [
            "headline", "bio", "hourly_rate", "currency",
            "availability", "location", "remote_only", "specialties",
        ]


class AvailabilityUpdateSerializer(serializers.Serializer):
    availability = serializers.ChoiceField(choices=Availability.choices)


# --- Proposals ---

class BudgetSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True)
    currency = serializers.CharField(default="BRL")
    kind = serializers.ChoiceField(choices=BudgetKind.choices)


class ProposalSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    company = serializers.CharField(source="tenant.legal_name", read_only=True)
    company_id = serializers.UUIDField(source="tenant.public_id", read_only=True)
    specialties = SpecialtySerializer(many=True, read_only=True)

    class Meta:
        model = Proposal
        fields = [
            "id", "company", "company_id", "title", "description", "scope_md",
            "budget_amount", "budget_currency", "budget_kind", "duration_weeks",
            "status", "visibility", "specialties", "published_at", "created_at",
        ]


class ProposalDetailSerializer(ProposalSerializer):
    """Igual ao ProposalSerializer + perfil da empresa, para a tela de detalhe."""

    company_profile = serializers.SerializerMethodField()

    class Meta(ProposalSerializer.Meta):
        fields = ProposalSerializer.Meta.fields + ["company_profile"]

    def get_company_profile(self, obj):
        prof = getattr(obj.tenant, "company_profile", None)
        return CompanyProfileSerializer(prof).data if prof else None


class ProposalCreateSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=8, max_length=140)
    description = serializers.CharField(max_length=10_000)
    scope_md = serializers.CharField(max_length=20_000)
    budget = BudgetSerializer()
    duration_weeks = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    visibility = serializers.ChoiceField(
        choices=ProposalVisibility.choices, default=ProposalVisibility.PUBLIC
    )
    specialties = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Specialty.objects.all(), required=False
    )


# --- Applications ---

class ApplicationSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    proposal_id = serializers.UUIDField(source="proposal.public_id", read_only=True)
    pentester_id = serializers.UUIDField(source="pentester.public_id", read_only=True)
    pentester_name = serializers.CharField(source="pentester.tenant.legal_name", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id", "proposal_id", "pentester_id", "pentester_name",
            "cover_message", "proposed_rate", "proposed_total",
            "status", "created_at",
        ]


class ApplicationCreateSerializer(serializers.Serializer):
    cover_message = serializers.CharField(min_length=20, max_length=4000)
    proposed_rate = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    proposed_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )


# --- Favorites ---


class FavoriteCreateSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=FavoriteTarget.choices)
    target_id = serializers.UUIDField()


class FavoriteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    target_id = serializers.UUIDField(source="target_uuid", read_only=True)
    target = serializers.SerializerMethodField()

    class Meta:
        model = Favorite
        fields = ["id", "target_type", "target_id", "target", "created_at"]

    def get_target(self, obj):
        """Resolve dados do alvo. Devolve null se o target sumir (cascade não cobre)."""
        if obj.target_type == FavoriteTarget.PENTESTER:
            p = (
                PentesterProfile.objects.select_related("tenant")
                .prefetch_related("specialties")
                .filter(public_id=obj.target_uuid)
                .first()
            )
            if not p:
                return None
            return {
                "legal_name": p.tenant.legal_name,
                "headline": p.headline,
                "bio": p.bio,
                "hourly_rate": str(p.hourly_rate) if p.hourly_rate is not None else None,
                "currency": p.currency,
                "availability": p.availability,
                "location": p.location,
                "rating_avg": float(p.rating_avg) if p.rating_avg is not None else None,
                "verified": bool(p.verified_at),
                "specialties": [s.label for s in p.specialties.all()],
            }
        if obj.target_type == FavoriteTarget.PROPOSAL:
            pr = (
                Proposal.objects.select_related("tenant")
                .prefetch_related("specialties")
                .filter(public_id=obj.target_uuid)
                .first()
            )
            if not pr:
                return None
            return {
                "title": pr.title,
                "description": pr.description,
                "company": pr.tenant.legal_name,
                "budget_amount": str(pr.budget_amount) if pr.budget_amount is not None else None,
                "budget_currency": pr.budget_currency,
                "budget_kind": pr.budget_kind,
                "duration_weeks": pr.duration_weeks,
                "status": pr.status,
                "published_at": pr.published_at,
                "specialties": [s.label for s in pr.specialties.all()],
            }
        return None
