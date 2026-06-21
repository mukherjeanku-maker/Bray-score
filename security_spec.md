# Security Specification for Agnibina Card Club Application

## 1. Data Invariants

- **Read Access:** Registered members list (`players/*`), completes games archives (`history/*`), and active tournament table details (`activeSession/current`) can be read by any authenticated user. Unauthenticated visitors are denied.
- **Write Access - Players Profile:** Any authenticated user can register or update their player profile (`players/{playerId}`). However, the payload `id` must strictly match the write document path `{playerId}`. Users cannot modify another player's profile unless authenticated.
- **Write Access - Game History:** History documents (`history/{gameId}`) are immutable. Once written, they cannot be updated or deleted except by verified administrator accounts.
- **Write Access - Active Table:** Active table doc `activeSession/current` can be updated during active setup, gameplay, and ended states. All fields must be properly typed, and timestamps must match `request.time`.

---

## 2. The "Dirty Dozen" Malicious Payloads

These 12 specific JSON payloads are designed to challenge Identity, Integrity, and State boundaries. They must all yield `PERMISSION_DENIED`.

### Payload 1: Unauthorized Profile Impersonation
Attempting to create a player profile where the matching document ID path is `member-bob`, but the payload specifies a different ID `member-alice`.
```json
{
  "id": "member-alice",
  "name": "Alice Cooper",
  "officialName": "Alice Cooper",
  "nickname": "Alice"
}
```

### Payload 2: Hostile ID Poisoning (Resource Exhaustion)
Enforcing strong ID character pattern limits. Injecting a massive string containing non-alphanumeric unicode junk characters as the player ID path variable.
```json
// Path: players/$$$_MALICIOUS_POISON_STRING_$$$_LONG_TRUNCATE_EXHAUST_GATEWAY
{
  "id": "$$$_MALICIOUS_POISON_STRING_$$$_LONG_TRUNCATE_EXHAUST_GATEWAY",
  "name": "Poison ID User",
  "officialName": "Poison ID User",
  "nickname": "Poison"
}
```

### Payload 3: Illegal Fields / Invariant Bypass (The Shadow Update)
Injecting a ghost privilege/role field `isAdmin: true` into a profile update payload to compromise system control gates.
```json
{
  "id": "member-ashu",
  "name": "Ashu",
  "officialName": "Ashok Kumar",
  "nickname": "Ashu",
  "isAdmin": true
}
```

### Payload 4: Invalid Types / Schema Tampering
Setting optional fields with invalid non-string types to crash component render parses.
```json
{
  "id": "member-sanju",
  "name": "Sanju",
  "officialName": "Sanjay Banerjee",
  "nickname": 12345
}
```

### Payload 5: Anonymous Play / Unauthenticated Profile Modification
Modifying clubhouse database attributes without any valid authentication credentials session.
```json
{
  "id": "guest-4",
  "name": "Guest Play",
  "officialName": "Guest Play"
}
```

### Payload 6: Forged Historical Logs Creation (Impersonated Winner Name)
Forging a completed match log with a custom forged date, invalid game structure, or arbitrary non-verified winner names without permissions.
```json
{
  "id": "game-fake-1",
  "players": [],
  "rounds": [],
  "date": "2020-01-01T00:00:00Z",
  "winnerName": "Invisible Forged User"
}
```

### Payload 7: History Edit Hack (State Shortcutting)
Attempting to mutate high-scores or scores records inside an already concluded and archived historical game.
```json
{
  "winnerName": "Ashu",
  "rounds": [
    {
      "roundNumber": 1,
      "scores": { "member-1": -50 }
    }
  ]
}
```

### Payload 8: History Deletion Attack
An unauthorized standard user trying to delete archived logs from the history database.
```json
// DELETE command on history/game-abc-123 without admin handshake.
{}
```

### Payload 9: Empty Player Name Guard
Registering a member with an empty officialName, or names violating minimum size bounds.
```json
{
  "id": "member-void",
  "name": "Void",
  "officialName": ""
}
```

### Payload 10: Active Session Status Corruption
Injecting active card table game status with invalid values outside allowable enum scope (e.g. `status: "heaven"`).
```json
{
  "players": [],
  "rounds": [],
  "status": "heaven"
}
```

### Payload 11: Non-Numeric Tally Fraud
Sending non-numeric values as scores inside the active table rounds.
```json
{
  "players": [],
  "rounds": [
    {
      "roundNumber": 1,
      "scores": { "member-1": "ONE_MILLION_HACK" }
    }
  ],
  "status": "playing"
}
```

### Payload 12: Forged Timestamps
Overriding local tournament synchronization markers with client-side clock values instead of `request.time`.
```json
{
  "players": [],
  "rounds": [],
  "status": "playing",
  "lastAutoSavedTime": "2001-01-01T00:00:00Z"
}
```

---

## 3. Test Runner Simulation (firestore.rules.test.ts)

A TypeScript simulator template illustrating local rule validation tests:

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("Agnibina Clubhouse Firestore Rules Spec Tests", () => {
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "quirky-rex-9k91c",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("should fail authentication check on unauthenticated reads/writes", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.doc("activeSession/current").get());
    await assertFails(unauthedDb.doc("players/member-ashu").get());
  });

  it("should fail profile update when ID doesn't match path ID (Payload 1)", async () => {
    const authedDb = testEnv.authenticatedContext("user-123").firestore();
    await assertFails(
      authedDb.doc("players/member-bob").set({
        id: "member-alice",
        name: "Alice Cooper",
        officialName: "Alice Cooper"
      })
    );
  });

  it("should fail profile update/creation on ID poisoning attempt (Payload 2)", async () => {
    const authedDb = testEnv.authenticatedContext("user-123").firestore();
    const maliciousId = "$$$_MALICIOUS_POISON_STRING_$$$_LONG_TRUNCATE_EXHAUST_GATEWAY";
    await assertFails(
      authedDb.doc(`players/${maliciousId}`).set({
        id: maliciousId,
        name: "Poison ID User",
        officialName: "Poison ID User"
      })
    );
  });

  it("should fail profile save with extra privileges field (Payload 3)", async () => {
    const authedDb = testEnv.authenticatedContext("user-123").firestore();
    await assertFails(
      authedDb.doc("players/member-ashu").set({
        id: "member-ashu",
        name: "Ashu",
        officialName: "Ashok Kumar",
        nickname: "Ashu",
        isAdmin: true
      })
    );
  });

  it("should prevent non-admins from clearing completed game history (Payload 8)", async () => {
    const standardUserDb = testEnv.authenticatedContext("user-123").firestore();
    await assertFails(standardUserDb.doc("history/game-abc").delete());
  });
});
```
