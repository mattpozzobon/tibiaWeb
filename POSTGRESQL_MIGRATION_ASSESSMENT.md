# PostgreSQL Migration Assessment

## Current Setup Analysis

### Current Database: SQLite3
- **File**: `accounts.db` (single-file database)
- **Location**: Persistent volume on Fly.io (`/data/accounts.db`)
- **Storage**: ~1GB RAM, 1 CPU (single instance)
- **Architecture**: Callback-based API, JSON columns for complex data

### Database Schema
- `accounts` table: `uid`, `email`
- `characters` table: `id`, `uid`, `name`, `sex`, `role`, `last_visit`, plus JSON columns:
  - `position` (JSON: `{x, y, z}`)
  - `temple_position` (JSON: `{x, y, z}`)
  - `properties` (JSON: all player properties)
  - `outfit` (JSON: outfit data)
  - `skills` (JSON: all skills)
  - `containers` (JSON: depot, equipment, inbox, keyring)
  - `friends` (JSON: `{friends: [], requests: []}`)
  - `spellbook` (JSON: spellbook data)

### Query Patterns
- Simple SELECT, INSERT, UPDATE operations
- No complex JOINs or transactions observed
- JSON parsing happens in application layer
- Callback-based async operations

---

## Should You Migrate to PostgreSQL?

### ✅ **Migrate if:**
1. **Horizontal Scaling** - You plan to run multiple game server instances sharing the same database
2. **High Concurrency** - Many players writing simultaneously (SQLite has write locks that block reads)
3. **Advanced JSON Queries** - Need to query/search inside JSON columns (PostgreSQL's JSONB is much better)
4. **Better Backup/Replication** - Need point-in-time recovery, streaming replication
5. **Future Growth** - Expecting >100 concurrent players with frequent writes
6. **Multi-Region** - Need read replicas in different regions

### ❌ **Stay with SQLite if:**
1. **Single Instance** - Only one game server instance
2. **Low-Medium Load** - <50 concurrent players, infrequent writes
3. **Simplicity** - Current setup works fine, no immediate issues
4. **Cost** - Want to avoid additional database service costs
5. **Deployment Simplicity** - Single file is easier to manage/backup

### 🎯 **Verdict for Your Use Case**
Based on your current setup (single VM, 1GB RAM, 1 CPU), **SQLite is probably fine for now**. However, if you plan to scale or need better concurrency, PostgreSQL would be beneficial.

**Recommendation**: Migrate to PostgreSQL if you're planning for growth, otherwise optimize SQLite first.

---

## Migration Steps (if proceeding)

### Phase 1: Setup PostgreSQL

#### Option A: Fly.io PostgreSQL (Recommended)
```bash
# Create PostgreSQL database on Fly.io
fly postgres create --name emperia-db --region lhr --vm-size shared-cpu-1x --volume-size 10

# Create app for database
fly postgres attach --app emperia-db emperia-server

# This will add DATABASE_URL to your app's secrets
```

#### Option B: Managed PostgreSQL (Supabase, Neon, etc.)
- Create database instance
- Get connection string
- Add to Fly.io secrets: `fly secrets set DATABASE_URL="postgresql://..."`

#### Option C: Self-hosted PostgreSQL in Docker
```dockerfile
# Add to dockerfile or fly.toml
# Requires running PostgreSQL in a separate Fly.io app
```

### Phase 2: Install Dependencies

```bash
npm install pg @types/pg
npm uninstall sqlite3  # After migration is complete
```

### Phase 3: Create PostgreSQL Adapter

Create `src/database/account-database-postgres.ts`:

```typescript
import { Pool, QueryResult } from "pg";
import { CharacterCreator } from "../creature/player/character-creator";
import { CharacterData } from "./account-database-grouped";

export class AccountDatabasePostgres {
  private pool: Pool;
  private characterCreator: CharacterCreator;

  constructor(connectionString: string) {
    this.characterCreator = new CharacterCreator();
    this.pool = new Pool({
      connectionString,
      // Connection pool settings
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  // Convert callback-based API to promise-based for PostgreSQL
  private query<T>(text: string, params: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  // Account methods (convert to async/await or wrap in promises)
  public async getAccountByUid(uid: string): Promise<{ uid: string; email: string | null } | null> {
    const result = await this.query<{ uid: string; email: string | null }>(
      "SELECT uid, email FROM accounts WHERE uid = $1",
      [uid]
    );
    return result.rows[0] || null;
  }

  public async createAccountForUid(uid: string, email: string | null): Promise<number | null> {
    try {
      await this.query(
        "INSERT INTO accounts(uid, email) VALUES($1, $2)",
        [uid, email]
      );
      return null; // Success
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        return 409; // Conflict
      }
      console.error('Error creating account:', error);
      return 500;
    }
  }

  // Character methods...
  // (Convert all methods similarly, using $1, $2, etc. for parameters)
  
  public async getCharacterByName(name: string): Promise<CharacterData | null> {
    const result = await this.query<CharacterData>(
      `SELECT 
        id, uid, name, sex, role, last_visit,
        position, temple_position, properties, outfit, skills,
        containers, friends, spellbook
      FROM characters WHERE name = $1 COLLATE NOCASE`,
      [name]
    );
    return result.rows[0] || null;
  }

  // Close pool on shutdown
  public async close(): Promise<void> {
    await this.pool.end();
  }
}
```

### Phase 4: Create Database Schema Migration

Create migration script `migrations/001_initial_schema.sql`:

```sql
-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  uid VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255)
);

-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) NOT NULL REFERENCES accounts(uid),
  name VARCHAR(255) NOT NULL UNIQUE,
  sex VARCHAR(10) NOT NULL,
  role INTEGER NOT NULL DEFAULT 0,
  last_visit BIGINT NOT NULL DEFAULT 0,
  
  -- JSON columns (PostgreSQL has excellent JSONB support)
  position JSONB NOT NULL DEFAULT '{"x": 10, "y": 10, "z": 9}',
  temple_position JSONB NOT NULL DEFAULT '{"x": 10, "y": 10, "z": 9}',
  properties JSONB NOT NULL DEFAULT '{}',
  outfit JSONB NOT NULL DEFAULT '{}',
  skills JSONB NOT NULL DEFAULT '{}',
  containers JSONB NOT NULL DEFAULT '{"depot": [], "equipment": [], "inbox": [], "keyring": []}',
  friends JSONB NOT NULL DEFAULT '{"friends": [], "requests": []}',
  spellbook JSONB NOT NULL DEFAULT '{"availableSpells": [], "cooldowns": []}'
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_characters_uid ON characters(uid);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_name_lower ON characters(LOWER(name)); -- For case-insensitive searches

-- Create GIN indexes for JSONB columns (for advanced queries)
CREATE INDEX IF NOT EXISTS idx_characters_containers_gin ON characters USING GIN (containers);
CREATE INDEX IF NOT EXISTS idx_characters_properties_gin ON characters USING GIN (properties);
```

### Phase 5: Data Migration Script

Create `scripts/migrate-to-postgres.ts`:

```typescript
import sqlite3 from "sqlite3";
import { Pool } from "pg";
import * as fs from "fs";

const sqlitePath = process.env.ACCOUNT_DATABASE || "accounts.db";
const postgresUrl = process.env.DATABASE_URL;

if (!postgresUrl) {
  console.error("DATABASE_URL environment variable required");
  process.exit(1);
}

const pool = new Pool({ connectionString: postgresUrl });

async function migrate() {
  // Read from SQLite
  const sqliteDb = new sqlite3.Database(sqlitePath);
  
  // Migrate accounts
  const accounts = await new Promise<any[]>((resolve, reject) => {
    sqliteDb.all("SELECT uid, email FROM accounts", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows as any[]);
    });
  });

  for (const account of accounts) {
    await pool.query(
      "INSERT INTO accounts(uid, email) VALUES($1, $2) ON CONFLICT (uid) DO NOTHING",
      [account.uid, account.email]
    );
  }
  console.log(`Migrated ${accounts.length} accounts`);

  // Migrate characters
  const characters = await new Promise<any[]>((resolve, reject) => {
    sqliteDb.all(
      `SELECT id, uid, name, sex, role, last_visit,
       position, temple_position, properties, outfit, skills,
       containers, friends, spellbook
       FROM characters`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows as any[]);
      }
    );
  });

  for (const char of characters) {
    await pool.query(
      `INSERT INTO characters(
        id, uid, name, sex, role, last_visit,
        position, temple_position, properties, outfit, skills,
        containers, friends, spellbook
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        uid = EXCLUDED.uid,
        name = EXCLUDED.name,
        sex = EXCLUDED.sex,
        role = EXCLUDED.role,
        last_visit = EXCLUDED.last_visit,
        position = EXCLUDED.position,
        temple_position = EXCLUDED.temple_position,
        properties = EXCLUDED.properties,
        outfit = EXCLUDED.outfit,
        skills = EXCLUDED.skills,
        containers = EXCLUDED.containers,
        friends = EXCLUDED.friends,
        spellbook = EXCLUDED.spellbook`,
      [
        char.id, char.uid, char.name, char.sex, char.role, char.last_visit,
        char.position, char.temple_position, char.properties, char.outfit,
        char.skills, char.containers, char.friends, char.spellbook
      ]
    );
  }
  console.log(`Migrated ${characters.length} characters`);

  sqliteDb.close();
  await pool.end();
  console.log("Migration complete!");
}

migrate().catch(console.error);
```

### Phase 6: Update Configuration

Update `src/config/config.ts`:
```typescript
DATABASE: {
  TYPE: process.env.DATABASE_TYPE || "sqlite", // "sqlite" | "postgres"
  ACCOUNT_DATABASE: process.env.ACCOUNT_DATABASE || "accounts.db", // SQLite path
  DATABASE_URL: process.env.DATABASE_URL, // PostgreSQL connection string
}
```

Update `src/server/gameserver.ts`:
```typescript
import { AccountDatabaseGrouped } from "../database/account-database-grouped";
import { AccountDatabasePostgres } from "../database/account-database-postgres";

constructor() {
  // ...
  const dbType = CONFIG.DATABASE.TYPE || "sqlite";
  if (dbType === "postgres") {
    this.accountDatabase = new AccountDatabasePostgres(CONFIG.DATABASE.DATABASE_URL);
  } else {
    this.accountDatabase = new AccountDatabaseGrouped(
      process.env.ACCOUNT_DATABASE || CONFIG.DATABASE.ACCOUNT_DATABASE
    );
  }
}
```

### Phase 7: Update fly.toml

```toml
[env]
  # ... existing env vars ...
  DATABASE_TYPE = "postgres"
  DATABASE_URL = "${DATABASE_URL}"  # Set via fly secrets
```

### Phase 8: Testing

1. Run migration script in development
2. Test all database operations
3. Verify data integrity
4. Performance testing with load
5. Rollback plan ready

---

## Benefits After Migration

### Performance
- **Better Concurrency**: No write locks blocking reads
- **Connection Pooling**: Reuse connections efficiently
- **Better Indexing**: GIN indexes on JSONB for fast queries

### Features
- **JSON Queries**: Query inside JSON columns
  ```sql
  SELECT * FROM characters WHERE containers->>'inbox' IS NOT NULL;
  ```
- **Full-Text Search**: Search player names efficiently
- **Transactions**: Proper ACID transactions
- **Replication**: Read replicas for scaling

### Reliability
- **Backups**: Point-in-time recovery
- **High Availability**: Automatic failover
- **Monitoring**: Better observability tools

---

## Cost Considerations

### Fly.io PostgreSQL
- **Shared CPU**: ~$1.94/month + storage ($0.15/GB)
- **Dedicated**: ~$29/month + storage

### Managed Services (Alternatives)
- **Supabase**: Free tier available, then ~$25/month
- **Neon**: Free tier, then pay-as-you-go
- **Railway**: ~$5-20/month

---

## Recommendation

**For your current scale (single instance, small-medium player base):**
- **Keep SQLite** for now
- Optimize SQLite first:
  - Add WAL mode (`PRAGMA journal_mode=WAL;`)
  - Increase cache size (`PRAGMA cache_size=10000;`)
  - Use connection pooling wrapper

**Migrate to PostgreSQL when:**
- You plan to scale horizontally (multiple game servers)
- You have >100 concurrent players
- You need advanced JSON queries
- You need better backup/replication

---

## Quick Wins with SQLite (Before Migration)

```typescript
// In AccountDatabaseGrouped constructor, after creating database:
this.db.exec(`
  PRAGMA journal_mode=WAL;          -- Write-Ahead Logging for better concurrency
  PRAGMA synchronous=NORMAL;        -- Faster writes (still safe)
  PRAGMA cache_size=10000;          -- 10MB cache (adjust based on RAM)
  PRAGMA foreign_keys=ON;           -- Enable foreign key constraints
  PRAGMA temp_store=MEMORY;         -- Store temp tables in RAM
`);
```

These optimizations can give you 2-5x performance improvement without migration.
