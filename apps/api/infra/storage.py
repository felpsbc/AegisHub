"""Wrapper boto3 que aponta para MinIO em dev e S3 em prod.

Toda gravação vai para o bucket configurado em S3_CONFIG. Em produção,
SSE-KMS é exigido; em dev (MinIO) é ignorado pelo backend.
"""

from __future__ import annotations

import boto3
from botocore.client import Config
from django.conf import settings


def s3_client():
    cfg = settings.S3_CONFIG
    return boto3.client(
        "s3",
        endpoint_url=cfg["endpoint_url"],
        region_name=cfg["region"],
        aws_access_key_id=cfg["access_key"],
        aws_secret_access_key=cfg["secret_key"],
        config=Config(signature_version="s3v4"),
    )


def presigned_put(key: str, *, content_type: str, expires_in: int = 300) -> str:
    return s3_client().generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_CONFIG["bucket"],
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
        HttpMethod="PUT",
    )


def presigned_get(key: str, *, expires_in: int = 300) -> str:
    return s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_CONFIG["bucket"], "Key": key},
        ExpiresIn=expires_in,
        HttpMethod="GET",
    )
