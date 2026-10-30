import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { Post, AppSettings } from '../shared/types'

let db: Database | null = null
let dbFilePath = ''

function getDbPath(): string {
  const dir = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'data')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, 'arresuno.db')
}

export async function initDatabase(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()
  dbFilePath = getDbPath()

  if (fs.existsSync(dbFilePath)) {
    const filebuffer = fs.readFileSync(dbFilePath)
    db = new SQL.Database(filebuffer)
  } else {
    db = new SQL.Database()
  }

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      flair TEXT DEFAULT '💬 Relatable Life',
      status TEXT NOT NULL DEFAULT 'draft',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      posted_at TEXT,
      reddit_url TEXT,
      error TEXT,
      screenshot_path TEXT
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      title TEXT NOT NULL,
      posted_at TEXT NOT NULL,
      reddit_url TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  saveDbToDisk()
  seedInitialPostsIfEmpty()
  return db
}

function saveDbToDisk(): void {
  if (!db || !dbFilePath) return
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbFilePath, buffer)
  } catch (err) {
    console.error('Failed to flush SQLite to disk:', err)
  }
}

function seedInitialPostsIfEmpty(): void {
  const posts = getPosts()
  if (posts.length === 0) {
    const defaultPosts: Post[] = [
      {
        id: 'post-seed-1',
        title: 'What is that one unwritten rule in Indian households that everyone follows without questioning?',
        body: 'Growing up, there was this absolute golden rule: you never step on a book, paper, or notebook. If your foot even brushed against it by mistake, you had to instantly do the pranaam / touch-and-head gesture 3 times. What was that one unwritten rule in your house that you still find yourself following instinctively?',
        flair: '💬 Relatable Life',
        status: 'approved',
        order: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'post-seed-2',
        title: 'Samosa with Sweet Chutney or Mint Chutney? Let us settle this once and for all.',
        body: 'Arre suno, at every tapri and halwai shop, people have very strong opinions. Some drown the samosa in sweet saunth chutney, while purists only take the spicy green teekhi chutney. Where do you stand on this debate?',
        flair: '☕ Chai Tapri Debates',
        status: 'draft',
        order: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'post-seed-3',
        title: 'Harmless confession: That one thing you secretly did as a kid and blamed on your sibling',
        body: "Confession time: in 2008, I broke my dad's favourite steel flask while playing indoor cricket with a cosco ball. I quietly rolled it under the sofa and told mom that my brother threw it. He got a 20-minute lecture on responsibility. What's your harmless childhood confession?",
        flair: '🤫 Harmless Confessions',
        status: 'draft',
        order: 3,
        createdAt: new Date().toISOString(),
      },
    ]

    for (const p of defaultPosts) {
      savePost(p)
    }
  }
}

export function getPosts(): Post[] {
  if (!db) return []
  const stmt = db.prepare('SELECT * FROM posts ORDER BY order_index ASC, created_at DESC')
  const results: Post[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push({
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      flair: String(row.flair || '💬 Relatable Life'),
      status: row.status as Post['status'],
      order: Number(row.order_index),
      createdAt: String(row.created_at),
      postedAt: row.posted_at ? String(row.posted_at) : undefined,
      redditUrl: row.reddit_url ? String(row.reddit_url) : undefined,
      error: row.error ? String(row.error) : undefined,
      screenshotPath: row.screenshot_path ? String(row.screenshot_path) : undefined,
    })
  }
  stmt.free()
  return results
}

export function savePost(post: Post): void {
  if (!db) return
  db.run(
    `INSERT OR REPLACE INTO posts (id, title, body, flair, status, order_index, created_at, posted_at, reddit_url, error, screenshot_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      post.id,
      post.title,
      post.body,
      post.flair || '💬 Relatable Life',
      post.status,
      post.order,
      post.createdAt,
      post.postedAt || null,
      post.redditUrl || null,
      post.error || null,
      post.screenshotPath || null,
    ]
  )
  saveDbToDisk()
}

export function deletePost(id: string): void {
  if (!db) return
  db.run('DELETE FROM posts WHERE id = ?', [id])
  saveDbToDisk()
}

export function reorderPosts(orderedPosts: Post[]): void {
  if (!db) return
  orderedPosts.forEach((post, index) => {
    db!.run('UPDATE posts SET order_index = ? WHERE id = ?', [index + 1, post.id])
  })
  saveDbToDisk()
}

export function recordPostSuccess(id: string, url: string): void {
  if (!db) return
  const now = new Date().toISOString()
  db.run('UPDATE posts SET status = "posted", posted_at = ?, reddit_url = ?, error = NULL WHERE id = ?', [
    now,
    url,
    id,
  ])

  const post = getPosts().find((p) => p.id === id)
  if (post) {
    db.run(
      'INSERT INTO history (id, post_id, title, posted_at, reddit_url) VALUES (?, ?, ?, ?, ?)',
      ['hist-' + Date.now(), id, post.title, now, url]
    )
  }
  saveDbToDisk()
}

export function recordPostFailure(id: string, error: string, screenshotPath?: string): void {
  if (!db) return
  db.run('UPDATE posts SET status = "failed", error = ?, screenshot_path = ? WHERE id = ?', [
    error,
    screenshotPath || null,
    id,
  ])
  saveDbToDisk()
}

export function getSetting(key: string, defaultVal: string): string {
  if (!db) return defaultVal
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
  stmt.bind([key])
  if (stmt.step()) {
    const val = String(stmt.getAsObject().value)
    stmt.free()
    return val
  }
  stmt.free()
  return defaultVal
}

export function setSetting(key: string, val: string): void {
  if (!db) return
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, val])
  saveDbToDisk()
}
