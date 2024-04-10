// Given the id in post body, kill the mysql process with that id

import { NextApiRequest, NextApiResponse } from 'next'
import { connection } from '@/db'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === 'POST') {
        const { id } = req.body
        if (!id) {
            return res.status(400).json({ error: 'id is required' })
        }
        // Kill the mysql process with the id
        // Use the id to kill the mysql process
        // res.status(200).json({ name: 'John Doe' });
        const conn = await connection
        await conn.query(`KILL ?`, [id])
        res.status(200).json({ id })
    } else {
        res.setHeader('Allow', ['POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}
