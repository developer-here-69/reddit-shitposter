import fs from "fs"
import path from "path"
import { DashboardState } from "./types"

const STATE_FILE = path.join(process.cwd(), "data", "dashboard-state.json")

const DEFAULT_STATE: DashboardState = {
  subreddit: "ArreSuno",
  geminiModel: "gemini-3.5-flash-lite",
  lastSyncAt: new Date().toISOString(),
  accounts: [
    {
      id: "acc_1",
      username: "mere_se_nhi_hota",
      clientId: "",
      clientSecret: "",
      isActive: true,
      dailyLimit: 2,
      postedToday: 0,
      color: "#ff4500", // Reddit orange
    },
    {
      id: "acc_2",
      username: "chai_tapri_vibes",
      clientId: "",
      clientSecret: "",
      isActive: true,
      dailyLimit: 2,
      postedToday: 0,
      color: "#3b82f6", // Blue
    },
    {
      id: "acc_3",
      username: "desimind_69",
      clientId: "",
      clientSecret: "",
      isActive: true,
      dailyLimit: 2,
      postedToday: 0,
      color: "#10b981", // Emerald
    },
  ],
  posts: [
    {
      id: "post_1",
      title: "What is the weirdest rule your parents made up just to win an argument?",
      body: "Arre suno, my mom had this absolute classic rule while growing up: if you sneeze while stepping out of the house, you have to sit down for two minutes and drink water, warna bad luck pakki. One day I was getting late for an exam, sneezed right at the door, and she literally blocked the exit like a bouncer. I survived the exam somehow, but till today I have no idea where these unwritten laws come from. What bizarre superstitions or rules did your family enforce with a straight face?",
      category: "question",
      accountId: "acc_1",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // in 30 mins
      status: "queued",
      order: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "post_2",
      title: "Auto-rickshaw bhaiya's refusal skills deserve an Olympic medal",
      body: "Bhai honestly, no one has rejected me as effortlessly in life as Bangalore/Delhi auto walas. You tell them the destination with so much hope, they just give you a slow up-and-down stare, shake their head in a single millimeter vibration, and accelerate away without saying a single word. What is the most absurd reason or gesture an auto/cab driver gave you to cancel your ride?",
      category: "relatable_life",
      accountId: "acc_2",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 180).toISOString(), // in 3 hours
      status: "queued",
      order: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: "post_3",
      title: "Harmless confession: I still inspect the chips packet volume like an appraiser before buying",
      body: "Arre suno, I will literally stand in the supermarket aisle gently squeezing 4 different bags of Blue Lays to calculate the nitrogen-to-potato ratio before picking one. Deep down I know they all have 6 chips and 90% air, but the hope never dies. What is that one totally pointless habit you refuse to stop doing?",
      category: "harmless_confession",
      accountId: "acc_3",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 360).toISOString(), // in 6 hours
      status: "queued",
      order: 3,
      createdAt: new Date().toISOString(),
    },
  ],
}

export function getDashboardState(): DashboardState {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      const dir = path.dirname(STATE_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf-8")
      return DEFAULT_STATE
    }
    const content = fs.readFileSync(STATE_FILE, "utf-8")
    return JSON.parse(content)
  } catch (err) {
    console.error("Error reading dashboard state:", err)
    return DEFAULT_STATE
  }
}

export function saveDashboardState(state: DashboardState): void {
  try {
    const dir = path.dirname(STATE_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    state.lastSyncAt = new Date().toISOString()
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8")
  } catch (err) {
    console.error("Error saving dashboard state:", err)
  }
}
