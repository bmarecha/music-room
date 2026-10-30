import pytest
from httpx import AsyncClient


async def _register_user(client: AsyncClient, email: str, name: str) -> dict:
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "public_name": name},
    )
    assert res.status_code == 201
    return res.json()


@pytest.mark.asyncio
async def test_friends_visibility_in_profile(client: AsyncClient):
    alice = await _register_user(client, "alice@test.com", "Alice")
    token = alice["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Default friends_visibility is "friends"
    res = await client.get("/api/v1/users/me/profile", headers=headers)
    assert res.status_code == 200
    assert res.json()["friends_visibility"] == "friends"

    # Update friends_visibility to "private"
    update_res = await client.patch(
        "/api/v1/users/me/profile",
        headers=headers,
        json={"friends_visibility": "private"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["friends_visibility"] == "private"


@pytest.mark.asyncio
async def test_friend_invites_flow(client: AsyncClient):
    alice = await _register_user(client, "alice2@test.com", "Alice2")
    bob = await _register_user(client, "bob2@test.com", "Bob2")

    alice_headers = {"Authorization": f"Bearer {alice['access_token']}"}
    bob_headers = {"Authorization": f"Bearer {bob['access_token']}"}

    # Invite non-existent user -> 404
    res_404 = await client.post(
        "/api/v1/users/me/invites",
        headers=alice_headers,
        json={"public_name": "GhostUser"},
    )
    assert res_404.status_code == 404

    # Invite self -> 400
    res_self = await client.post(
        "/api/v1/users/me/invites",
        headers=alice_headers,
        json={"public_name": "Alice2"},
    )
    assert res_self.status_code == 400

    # Alice invites Bob -> 201
    res_invite = await client.post(
        "/api/v1/users/me/invites",
        headers=alice_headers,
        json={"public_name": "Bob2"},
    )
    assert res_invite.status_code == 201
    invite_data = res_invite.json()
    assert invite_data["other_user_name"] == "Bob2"
    assert invite_data["direction"] == "sent"

    # Duplicate invite -> 400
    res_dup = await client.post(
        "/api/v1/users/me/invites",
        headers=alice_headers,
        json={"public_name": "Bob2"},
    )
    assert res_dup.status_code == 400

    # Also supports inviting by email
    charlie = await _register_user(client, "charlie_inv@test.com", "Charlie")
    res_invite_email = await client.post(
        "/api/v1/users/me/invites",
        headers=alice_headers,
        json={"public_name": "charlie_inv@test.com"},
    )
    assert res_invite_email.status_code == 201
    assert res_invite_email.json()["other_user_name"] == "Charlie"

    # Alice lists invites -> sees 1 sent to Bob and 1 sent to Charlie
    alice_invites = await client.get("/api/v1/users/me/invites", headers=alice_headers)
    assert alice_invites.status_code == 200
    assert len(alice_invites.json()) == 2
    assert alice_invites.json()[0]["direction"] == "sent"

    # Bob lists invites -> sees 1 received
    bob_invites = await client.get("/api/v1/users/me/invites", headers=bob_headers)
    assert bob_invites.status_code == 200
    assert len(bob_invites.json()) == 1
    assert bob_invites.json()[0]["direction"] == "received"
    assert bob_invites.json()[0]["other_user_name"] == "Alice2"

    # Bob accepts invite -> 200
    res_accept = await client.post(
        f"/api/v1/users/me/invites/{alice['user']['id']}/accept",
        headers=bob_headers,
    )
    assert res_accept.status_code == 200

    # Now Alice and Bob are friends
    alice_friends = await client.get("/api/v1/users/me/friends", headers=alice_headers)
    assert alice_friends.status_code == 200
    assert len(alice_friends.json()) == 1
    assert alice_friends.json()[0]["public_name"] == "Bob2"

    bob_friends = await client.get("/api/v1/users/me/friends", headers=bob_headers)
    assert bob_friends.status_code == 200
    assert len(bob_friends.json()) == 1
    assert bob_friends.json()[0]["public_name"] == "Alice2"

    # Alice deletes friendship with Bob -> 204
    del_res = await client.delete(
        f"/api/v1/users/me/friends/{bob['user']['id']}",
        headers=alice_headers,
    )
    assert del_res.status_code == 204

    # Both lists are now empty
    alice_friends_after = await client.get("/api/v1/users/me/friends", headers=alice_headers)
    assert len(alice_friends_after.json()) == 0


@pytest.mark.asyncio
async def test_friends_visibility_enforcement(client: AsyncClient):
    alice = await _register_user(client, "alice3@test.com", "Alice3")
    bob = await _register_user(client, "bob3@test.com", "Bob3")
    charlie = await _register_user(client, "charlie3@test.com", "Charlie3")

    alice_headers = {"Authorization": f"Bearer {alice['access_token']}"}
    bob_headers = {"Authorization": f"Bearer {bob['access_token']}"}
    charlie_headers = {"Authorization": f"Bearer {charlie['access_token']}"}

    # Alice and Bob become friends
    await client.post("/api/v1/users/me/invites", headers=alice_headers, json={"public_name": "Bob3"})
    await client.post(f"/api/v1/users/me/invites/{alice['user']['id']}/accept", headers=bob_headers)

    # By default, Alice's friends_visibility is "friends".
    # Bob (friend) can view Alice's friends:
    bob_view = await client.get(f"/api/v1/users/{alice['user']['id']}/friends", headers=bob_headers)
    assert bob_view.status_code == 200
    assert len(bob_view.json()) == 1

    # Charlie (not friend) cannot view Alice's friends:
    charlie_view = await client.get(f"/api/v1/users/{alice['user']['id']}/friends", headers=charlie_headers)
    assert charlie_view.status_code == 200
    assert len(charlie_view.json()) == 0

    # Alice sets friends_visibility to "public"
    await client.patch("/api/v1/users/me/profile", headers=alice_headers, json={"friends_visibility": "public"})
    charlie_view2 = await client.get(f"/api/v1/users/{alice['user']['id']}/friends", headers=charlie_headers)
    assert len(charlie_view2.json()) == 1

    # Alice sets friends_visibility to "private"
    await client.patch("/api/v1/users/me/profile", headers=alice_headers, json={"friends_visibility": "private"})
    bob_view2 = await client.get(f"/api/v1/users/{alice['user']['id']}/friends", headers=bob_headers)
    assert len(bob_view2.json()) == 0


@pytest.mark.asyncio
async def test_duplicate_public_name_handling(client: AsyncClient):
    alice = await _register_user(client, "alice_dup@test.com", "AliceDup")
    # Two users with same public_name "Google User"
    user1 = await _register_user(client, "g1@test.com", "Google User")
    await _register_user(client, "g2@test.com", "Google User")

    alice_headers = {"Authorization": f"Bearer {alice['access_token']}"}

    # Inviting by non-unique public_name returns 400 instructing to use email
    res_ambiguous = await client.post(
        "/api/v1/users/me/invites",
        headers=alice_headers,
        json={"public_name": "Google User"},
    )
    assert res_ambiguous.status_code == 400
    assert "email" in res_ambiguous.json()["detail"].lower()

    # Inviting by exact email succeeds
    res_email = await client.post(
        "/api/v1/users/me/invites",
        headers=alice_headers,
        json={"public_name": "g1@test.com"},
    )
    assert res_email.status_code == 201
    assert res_email.json()["other_user_id"] == user1["user"]["id"]


