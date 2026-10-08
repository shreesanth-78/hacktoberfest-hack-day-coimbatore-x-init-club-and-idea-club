"""The backend can serve the built frontend, so one service hosts the whole game."""
import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app


@pytest.fixture
def dist(tmp_path):
    d = tmp_path / "dist"
    (d / "assets").mkdir(parents=True)
    (d / "index.html").write_text("<html>APP</html>", encoding="utf-8")
    (d / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("outside the dist folder", encoding="utf-8")
    return d


def client(tmp_path, dist, fake_guard):
    settings = Settings(database_path=str(tmp_path / "t.db"), cors_origins=[], frontend_dist=str(dist) if dist else "")
    return TestClient(create_app(settings=settings, guard_fn=fake_guard))


def test_serves_the_app_and_its_assets(tmp_path, dist, fake_guard):
    c = client(tmp_path, dist, fake_guard)
    assert c.get("/").text == "<html>APP</html>"
    assert c.get("/assets/app.js").text == "console.log(1)"
    # client-side routes (React Router) get the app
    assert c.get("/world").text == "<html>APP</html>"
    assert c.get("/play/civic/1").text == "<html>APP</html>"


def test_api_routes_still_work_and_unknown_api_paths_keep_the_error_format(tmp_path, dist, fake_guard):
    c = client(tmp_path, dist, fake_guard)
    assert c.get("/api/health").json() == {"status": "ok"}
    assert len(c.get("/api/levels").json()["levels"]) == 30
    r = c.get("/api/nope")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_files_outside_the_dist_folder_are_not_served(tmp_path, dist, fake_guard):
    c = client(tmp_path, dist, fake_guard)
    for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/assets/../../secret.txt"):
        assert "outside the dist folder" not in c.get(path).text


def test_without_a_build_nothing_is_served(tmp_path, fake_guard):
    c = client(tmp_path, None, fake_guard)
    assert c.get("/").status_code == 404
    assert c.get("/api/health").status_code == 200
