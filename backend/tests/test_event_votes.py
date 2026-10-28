import asyncio

from httpx import AsyncClient

API = "/api/v1"
VOTERS = 30


async def create_event(client: AsyncClient, host_id: int) -> int:
    response = await client.post(
        f"{API}/events", json={"title": "Concurrency"}, headers={"X-User-Id": str(host_id)}
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def vote(client: AsyncClient, event_id: int, user_id: int, track: dict, value: int = 1):
    return await client.post(
        f"{API}/events/{event_id}/votes",
        json={"track_id": track["id"], "vote_value": value, "track": track},
        headers={"X-User-Id": str(user_id)},
    )


async def score_of(client: AsyncClient, event_id: int, track_id: str) -> int:
    response = await client.get(f"{API}/events/{event_id}/tracks")
    assert response.status_code == 200, response.text
    return next(item["score"] for item in response.json() if item["track"]["id"] == track_id)


async def test_many_users_vote_on_same_new_track(client, user_ids, new_track):
    track = new_track()
    event_id = await create_event(client, user_ids[0])

    responses = await asyncio.gather(*(vote(client, event_id, uid, track) for uid in user_ids))

    assert all(r.status_code == 201 for r in responses), [r.text for r in responses if r.status_code != 201]
    assert await score_of(client, event_id, track["id"]) == VOTERS


async def test_same_user_voting_concurrently_counts_once(client, user_ids, new_track):
    track = new_track()
    event_id = await create_event(client, user_ids[0])

    responses = await asyncio.gather(*(vote(client, event_id, user_ids[0], track) for _ in range(20)))

    assert all(r.status_code == 201 for r in responses)
    assert await score_of(client, event_id, track["id"]) == 1


async def test_changing_a_vote_replaces_the_previous_one(client, user_ids, new_track):
    track = new_track()
    event_id = await create_event(client, user_ids[0])

    await vote(client, event_id, user_ids[0], track, value=1)
    await vote(client, event_id, user_ids[0], track, value=-1)

    assert await score_of(client, event_id, track["id"]) == -1


async def test_mixed_up_and_down_votes(client, user_ids, new_track):
    track = new_track()
    event_id = await create_event(client, user_ids[0])

    values = [1 if i % 3 else -1 for i in range(VOTERS)]
    await asyncio.gather(
        *(vote(client, event_id, uid, track, value) for uid, value in zip(user_ids, values))
    )

    assert await score_of(client, event_id, track["id"]) == sum(values)
