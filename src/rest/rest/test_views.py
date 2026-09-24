from unittest.mock import patch

from django.test import SimpleTestCase
from pymongo.errors import ServerSelectionTimeoutError
from rest_framework.test import APIClient


class TodoApiTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("rest.views.todos")
    def test_get_returns_saved_todos(self, collection):
        collection.find.return_value.sort.return_value = [
            {"_id": "first-id", "description": "Learn Docker"},
            {"_id": "second-id", "description": "Learn React"},
        ]

        response = self.client.get("/todos/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [
            {"id": "first-id", "description": "Learn Docker"},
            {"id": "second-id", "description": "Learn React"},
        ])

    @patch("rest.views.todos")
    def test_post_trims_and_saves_description(self, collection):
        collection.insert_one.return_value.inserted_id = "new-id"

        response = self.client.post(
            "/todos/", {"description": "  Learn Mongo  "}, format="json"
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {
            "id": "new-id", "description": "Learn Mongo"
        })
        collection.insert_one.assert_called_once_with({"description": "Learn Mongo"})

    @patch("rest.views.todos")
    def test_post_rejects_blank_description_without_saving(self, collection):
        response = self.client.post(
            "/todos/", {"description": "   "}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        collection.insert_one.assert_not_called()

    @patch("rest.views.todos")
    def test_post_rejects_wrong_type_and_long_description(self, collection):
        for description in (42, "x" * 201):
            with self.subTest(description=description):
                response = self.client.post(
                    "/todos/", {"description": description}, format="json"
                )
                self.assertEqual(response.status_code, 400)
        collection.insert_one.assert_not_called()

    @patch("rest.views.todos")
    def test_post_rejects_non_json_requests(self, collection):
        response = self.client.post("/todos/", {"description": "Learn Docker"})

        self.assertEqual(response.status_code, 415)
        collection.insert_one.assert_not_called()

    @patch("rest.views.todos")
    def test_database_failure_returns_service_error(self, collection):
        collection.find.side_effect = ServerSelectionTimeoutError("unavailable")

        response = self.client.get("/todos/")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"error": "Could not load todos."})

    @patch("rest.views.todos")
    def test_write_failure_returns_service_error(self, collection):
        collection.insert_one.side_effect = ServerSelectionTimeoutError("unavailable")

        response = self.client.post(
            "/todos/", {"description": "Learn Mongo"}, format="json"
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"error": "Could not save todo."})
