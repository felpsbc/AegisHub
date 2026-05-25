from django.contrib import admin

from favorites.models import Favorite


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "target_type", "target_uuid", "created_at")
    list_filter = ("target_type",)
    search_fields = ("user__email",)
