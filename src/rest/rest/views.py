import os

from pymongo import MongoClient
from pymongo.errors import PyMongoError
from rest_framework import status
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

mongo_uri = f"mongodb://{os.environ['MONGO_HOST']}:{os.environ['MONGO_PORT']}"
db = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)["test_db"]
todos = db["todos"]


def as_json(todo):
    return {
        "id": str(todo["_id"]),
        "description": todo["description"],
    }


class TodoListView(APIView):
    parser_classes = [JSONParser]

    def get(self, request):
        try:
            items = todos.find({}, {"description": 1}).sort("_id", 1)
            return Response([as_json(item) for item in items])
        except PyMongoError:
            return Response(
                {"error": "Could not load todos."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response(
                {"error": "Expected a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        description = request.data.get("description")
        if not isinstance(description, str):
            return Response(
                {"error": "Description must be text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        description = description.strip()
        if not description or len(description) > 200:
            return Response(
                {"error": "Description must be 1–200 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = todos.insert_one({"description": description})
        except PyMongoError:
            return Response(
                {"error": "Could not save todo."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"id": str(result.inserted_id), "description": description},
            status=status.HTTP_201_CREATED,
        )
