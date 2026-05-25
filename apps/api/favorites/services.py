from __future__ import annotations

from uuid import UUID

from django.db import IntegrityError

from accounts.models import User
from favorites.models import Favorite, FavoriteTarget


class FavoriteError(Exception):
    pass


def add_favorite(*, user: User, target_type: str, target_uuid: UUID) -> Favorite:
    if target_type not in FavoriteTarget.values:
        raise FavoriteError("invalid_target_type")
    try:
        fav, _ = Favorite.objects.get_or_create(
            user=user, target_type=target_type, target_uuid=target_uuid
        )
    except IntegrityError as e:
        raise FavoriteError("conflict") from e
    return fav


def remove_favorite(*, user: User, public_id: UUID) -> None:
    deleted, _ = Favorite.objects.filter(user=user, public_id=public_id).delete()
    if deleted == 0:
        raise FavoriteError("not_found")


def list_favorites(*, user: User, target_type: str | None = None):
    qs = Favorite.objects.filter(user=user).order_by("-created_at")
    if target_type:
        if target_type not in FavoriteTarget.values:
            raise FavoriteError("invalid_target_type")
        qs = qs.filter(target_type=target_type)
    return qs
