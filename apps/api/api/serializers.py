from __future__ import annotations

from rest_framework import serializers

from accounts.models import User
from applications.models import Application
from pentesters.models import (
    Availability,
    Certification,
    PentesterCertification,
    PentesterProfile,
    Specialty,
)
from proposals.models import BudgetKind, Proposal, ProposalStatus, ProposalVisibility
from tenants.models import (
    DocumentKind,
    Membership,
    Tenant,
    TenantStatus,
    TenantType,
)


# --- Auth / User ---

class TenantSummarySerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = Tenant
        fields = ["id", "type", "legal_name", "status"]


class MembershipSerializer(serializers.ModelSerializer):
    tenant = TenantSummarySerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ["tenant", "role"]


class UserMeSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    memberships = MembershipSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "is_admin", "mfa_enabled", "memberships"]


# --- Auth in/out ---

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=12, write_only=True)
    full_name = serializers.CharField(max_length=200)
    tenant_type = serializers.ChoiceField(choices=TenantType.choices)
    legal_name = serializers.CharField(max_length=200)
    document = serializers.CharField(max_length=20)
    document_kind = serializers.ChoiceField(choices=DocumentKind.choices)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class MFASerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=10)


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


class ProposalCreateSerializer(serializers.Serializer):
    title = serializers.CharField(min_length=8, max_length=140)
    description = serializers.CharField()
    scope_md = serializers.CharField()
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
    cover_message = serializers.CharField(min_length=20)
    proposed_rate = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    proposed_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=False, allow_null=True
    )
