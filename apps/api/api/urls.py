from django.urls import path

from api import views

urlpatterns = [
    # auth
    path("auth/csrf", views.csrf_view, name="csrf"),
    path("auth/register", views.RegisterView.as_view()),
    path("auth/login", views.LoginView.as_view()),
    path("auth/login/mfa", views.LoginMFAView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("auth/me", views.MeView.as_view()),
    path("auth/mfa/setup", views.MFASetupView.as_view()),
    path("auth/mfa/enable", views.MFAEnableView.as_view()),

    # taxonomies
    path("specialties", views.SpecialtyListView.as_view()),

    # pentesters
    path("pentesters", views.PentesterListView.as_view()),
    path("pentesters/<uuid:public_id>", views.PentesterDetailView.as_view()),
    path("pentesters/<uuid:public_id>/availability", views.PentesterAvailabilityView.as_view()),

    # proposals
    path("proposals", views.ProposalListView.as_view()),
    path("proposals/<uuid:public_id>", views.ProposalDetailView.as_view()),
    path("proposals/<uuid:public_id>/publish", views.ProposalPublishView.as_view()),
    path("proposals/<uuid:public_id>/close", views.ProposalCloseView.as_view()),
    path("proposals/<uuid:public_id>/applications",
         views.ApplicationListByProposalView.as_view()),
    path("proposals/<uuid:public_id>/applications/new",
         views.ApplicationCreateView.as_view()),

    # applications
    path("applications/mine", views.ApplicationListMineView.as_view()),
    path("applications/<uuid:public_id>/<str:action>", views.ApplicationActionView.as_view()),
]
