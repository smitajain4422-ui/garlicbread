// api/admin.js
export default async function handler(req, res) {
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    // Connects to your new Vercel Database
    async function getDB() {
        const resp = await fetch(`${KV_URL}/get/nosify_data`, { headers: { Authorization: `Bearer ${KV_TOKEN}` }});
        const data = await resp.json();
        return data.result ? JSON.parse(data.result) : { keys: [{ key: "FREE", time: "perm", max: "perm", left: "perm", expires: null, claimedBy: null }], bans: [], logs: [] };
    }
    
    async function saveDB(db) {
        await fetch(`${KV_URL}/set/nosify_data`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${KV_TOKEN}` },
            body: JSON.stringify(db)
        });
    }

    if (req.method === 'GET') {
        if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
        let db = await getDB();
        return res.status(200).json(db);
    }

    if (req.method === 'POST') {
        const { action, payload } = req.body;
        let db = await getDB();

        // This allows users to deduct a chat without needing the admin password
        if (action === 'deduct_use') {
            let keyObj = db.keys.find(k => k.key === payload);
            if (keyObj && keyObj.left !== 'perm') keyObj.left--;
            await saveDB(db);
            return res.status(200).json({ success: true });
        }

        // --- EVERYTHING BELOW REQUIRES ADMIN PASSWORD ---
        if (req.headers.authorization !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });

        if (action === 'create_key') db.keys.push(payload);
        if (action === 'delete_key') db.keys.splice(payload, 1);
        if (action === 'revoke_key') {
            let idx = db.keys.findIndex(k => k.key === payload);
            if (idx !== -1) db.keys.splice(idx, 1);
        }
        if (action === 'ban_device') {
            if (!db.bans.includes(payload)) db.bans.push(payload);
        }

        await saveDB(db);
        return res.status(200).json({ success: true, db });
    }
          }
  
