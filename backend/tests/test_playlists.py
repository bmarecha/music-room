import asyncio

from httpx import AsyncClient

API = "/api/v1"


def h(user_id: int) -> dict:
    return {"X-User-Id": str(user_id)}


async def create_playlist(client: AsyncClient, user_id: int, **fields) -> int:
    response = await client.post(
        f"{API}/playlists", json={"title": "Road trip", **fields}, headers=h(user_id)
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def add_track(client, playlist_id, user_id, track, position=None):
    body = {"track_id": track["id"], "track": track}
    if position is not None:
        body["position"] = position
    return await client.post(f"{API}/playlists/{playlist_id}/tracks", json=body, headers=h(user_id))


async def order_of(client, playlist_id, user_id) -> list[tuple[str, int]]:
    response = await client.get(f"{API}/playlists/{playlist_id}/tracks", headers=h(user_id))
    assert response.status_code == 200, response.text
    return [(t["track_id"], t["position"]) for t in response.json()]


async def test_private_playlist_is_hidden_and_owner_only_edits(client, user_ids):
    owner, other = user_ids[0], user_ids[1]
    playlist_id = await create_playlist(client, owner, visibility="private")

    assert (await client.get(f"{API}/playlists/{playlist_id}", headers=h(owner))).status_code == 200
    assert (await client.get(f"{API}/playlists/{playlist_id}", headers=h(other))).status_code == 404

    listed = (await client.get(f"{API}/playlists", headers=h(other))).json()
    assert playlist_id not in [p["id"] for p in listed]

    public_id = await create_playlist(client, owner, visibility="public")
    response = await client.patch(f"{API}/playlists/{public_id}", json={"title": "Hacked"}, headers=h(other))
    assert response.status_code == 403

    response = await client.patch(f"{API}/playlists/{public_id}", json={"title": "Renamed"}, headers=h(owner))
    assert response.json()["title"] == "Renamed"

    assert (await client.delete(f"{API}/playlists/{public_id}", headers=h(owner))).status_code == 204
    assert (await client.get(f"{API}/playlists/{public_id}", headers=h(owner))).status_code == 404


async def test_positions_stay_contiguous(client, user_ids, new_track):
    owner = user_ids[0]
    playlist_id = await create_playlist(client, owner)
    t1, t2, t3, t4 = new_track(), new_track(), new_track(), new_track()

    for track in (t1, t2, t3):
        assert (await add_track(client, playlist_id, owner, track)).status_code == 201
    assert await order_of(client, playlist_id, owner) == [(t1["id"], 0), (t2["id"], 1), (t3["id"], 2)]

    # Insert at the beginning shifts the others.
    assert (await add_track(client, playlist_id, owner, t4, position=0)).status_code == 201
    assert await order_of(client, playlist_id, owner) == [
        (t4["id"], 0), (t1["id"], 1), (t2["id"], 2), (t3["id"], 3),
    ]

    # Removing closes the gap.
    response = await client.delete(f"{API}/playlists/{playlist_id}/tracks/{t1['id']}", headers=h(owner))
    assert response.status_code == 204
    assert await order_of(client, playlist_id, owner) == [(t4["id"], 0), (t2["id"], 1), (t3["id"], 2)]


async def test_same_track_twice_is_a_conflict(client, user_ids, new_track):
    owner = user_ids[0]
    playlist_id = await create_playlist(client, owner)
    track = new_track()

    assert (await add_track(client, playlist_id, owner, track)).status_code == 201
    assert (await add_track(client, playlist_id, owner, track)).status_code == 409


async def test_concurrent_adds_get_distinct_contiguous_positions(client, user_ids, new_track):
    owner = user_ids[0]
    playlist_id = await create_playlist(client, owner)  # public + everyone_edit
    tracks = [new_track() for _ in user_ids]

    responses = await asyncio.gather(
        *(add_track(client, playlist_id, uid, track) for uid, track in zip(user_ids, tracks))
    )

    assert all(r.status_code == 201 for r in responses), [r.text for r in responses if r.status_code != 201]
    positions = sorted(position for _, position in await order_of(client, playlist_id, owner))
    assert positions == list(range(len(user_ids)))


async def test_invited_only_edit_license(client, user_ids, new_track):
    owner, editor, viewer, stranger = user_ids[:4]
    playlist_id = await create_playlist(client, owner, license_restriction="invited_only_edit")

    for user_id, role in ((editor, "editor"), (viewer, "viewer")):
        response = await client.post(
            f"{API}/playlists/{playlist_id}/collaborators",
            json={"user_id": user_id, "role": role},
            headers=h(owner),
        )
        assert response.status_code == 201, response.text

    assert (await add_track(client, playlist_id, stranger, new_track())).status_code == 403
    assert (await add_track(client, playlist_id, viewer, new_track())).status_code == 403
    assert (await add_track(client, playlist_id, editor, new_track())).status_code == 201

    # Only the creator manages collaborators.
    response = await client.post(
        f"{API}/playlists/{playlist_id}/collaborators",
        json={"user_id": stranger},
        headers=h(editor),
    )
    assert response.status_code == 403

    response = await client.delete(
        f"{API}/playlists/{playlist_id}/collaborators/{editor}", headers=h(owner)
    )
    assert response.status_code == 204
    assert (await add_track(client, playlist_id, editor, new_track())).status_code == 403
