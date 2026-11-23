import pytest

from app.core.database import (
    clean_mongodb_uri,
    mask_mongodb_uri,
    _is_placeholder_url,
)


@pytest.mark.parametrize(
    "uri",
    [
        "mongodb+srv://<db_username>:<db_password>@<cluster-address>.mongodb.net/",
    ],
)
def test_placeholder_mongodb_uris_are_rejected(uri):
    assert _is_placeholder_url(clean_mongodb_uri(uri)) is True


def test_clean_and_mask_mongodb_uri():
    uri = "mongodb+srv://<admin>:<pass123>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
    cleaned = clean_mongodb_uri(uri)

    assert cleaned == "mongodb+srv://admin:pass123@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
    assert "pass123" not in mask_mongodb_uri(cleaned)
    assert "admin:****@" in mask_mongodb_uri(cleaned)

