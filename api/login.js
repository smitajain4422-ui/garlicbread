export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { key } = req.body;
    
    // Set this string in Vercel's Environment Variables panel
    const ADMIN_PASS = process.env.ADMIN_PASSWORD; 

    if (key === ADMIN_PASS) {
        return res.status(200).json({ success: true, role: "admin" });
    }

    return res.status(401).json({ success: false, error: "Invalid admin key" });
}

