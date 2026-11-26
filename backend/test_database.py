import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from pymongo.errors import OperationFailure, ServerSelectionTimeoutError

from app.core import database
from app.core.database import (
    clean_mongodb_uri,
    mask_mongodb_uri,
    _is_placeholder_url,
)

def test_placeholder_mongodb_uris_are_rejected():
    uri = "mongodb+srv://<db_username>:<db_password>@<cluster-address>.mongodb.net/"
    assert _is_placeholder_url(clean_mongodb_uri(uri)) is True

def test_clean_and_mask_mongodb_uri():
    uri = "mongodb+srv://<admin>:<pass123>@cluster0.example.com/?retryWrites=true&w=majority"
    cleaned = clean_mongodb_uri(uri)

    assert cleaned == "mongodb+srv://admin:pass123@cluster0.example.com/?retryWrites=true&w=majority"
    assert "pass123" not in mask_mongodb_uri(cleaned)
    assert "admin:****@" in mask_mongodb_uri(cleaned)


@pytest.fixture
def startup_client(monkeypatch):
    client = MagicMock()
    client.admin.command = AsyncMock()
    monkeypatch.setattr(database.settings, "MONGODB_URL", "mongodb://localhost:27017/")
    monkeypatch.setattr(database, "AsyncIOMotorClient", MagicMock(return_value=client))
    monkeypatch.setattr(database, "AsyncIOMotorGridFSBucket", MagicMock())
    monkeypatch.setattr(database, "create_db_indexes", AsyncMock())
    monkeypatch.setattr(database, "sleep", AsyncMock())
    yield client
    asyncio.run(database.close_mongo_connection())


def test_database_startup_recovers_from_first_connection_timeout(startup_client):
    startup_client.admin.command.side_effect = [ServerSelectionTimeoutError(), {"ok": 1}]

    asyncio.run(database.connect_to_mongo())

    assert startup_client.admin.command.await_count == 2
    assert database.db_manager.connected
    database.create_db_indexes.assert_awaited_once()


@pytest.mark.parametrize(
    ("error", "attempts", "message"),
    [
        (ServerSelectionTimeoutError("private host details"), 2, "Atlas Network Access"),
        (OperationFailure("private authentication details", code=18), 1, "Atlas database user"),
    ],
)
def test_database_startup_failure_closes_client_and_hides_driver_details(
    startup_client, error, attempts, message
):
    startup_client.admin.command.side_effect = error

    with pytest.raises(RuntimeError, match=message) as failure:
        asyncio.run(database.connect_to_mongo())

    assert "private" not in str(failure.value)
    assert startup_client.admin.command.await_count == attempts
    startup_client.close.assert_called_once()
    assert not database.db_manager.connected


if __name__ == "__main__":
    test_placeholder_mongodb_uris_are_rejected()
    test_clean_and_mask_mongodb_uri()
    print("Database URI cleaning and masking tests passed successfully!")

