"""Fixtures compartilhadas dos testes da API.

Celery roda em modo eager nos testes (ver `RUNNING_TESTS` em settings), então as
tasks de e-mail executam inline e `mailoutbox` captura o envio. Os testes que
dependem disso usam `django_capture_on_commit_callbacks` porque o enqueue acontece
em `transaction.on_commit`.
"""
from __future__ import annotations

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _reset_throttle_cache():
    """Zera o cache entre testes.

    Os endpoints de auth usam DRF throttling (AnonRateThrottle, scope `login`/`mfa`),
    cujo histórico vive no cache default. Sem limpar, uma bateria de testes que faz
    vários POSTs em `/auth/register` ou `/auth/login` acumula e estoura o limite,
    fazendo o teste seguinte receber 429 em vez do status esperado.
    """
    cache.clear()
    yield
    cache.clear()
