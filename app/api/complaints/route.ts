import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ComplaintPayload = {
  acknowledgement_no?: string
  fraud_category?: string
  fraud_amount?: number
  victim_name?: string
  victim_phone?: string
  victim_email?: string
  victim_bank?: string
  victim_account_no?: string
  mule_bank_name?: string
  mule_account_no?: string
  incident_timestamp?: string
  state?: string
  district?: string
  city?: string
  transaction_id?: string
  [key: string]: unknown
}

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ComplaintPayload
    const complaintId = payload.acknowledgement_no?.trim()

    if (!complaintId || !payload.fraud_category) {
      return NextResponse.json({ error: 'Acknowledgement number and fraud category are required.' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('complaints')
      .insert({
        complaint_id: complaintId,
        complaint_date: payload.incident_timestamp ?? new Date().toISOString(),
        crime_category: payload.fraud_category,
        state: payload.state ?? null,
        district: payload.district ?? null,
        city: payload.city ?? null,
        amount: payload.fraud_amount ?? null,
        complainant_type: 'citizen',
        status: 'submitted',
        source: 'ncrp-portal',
        raw_reference: JSON.stringify({
          ...payload,
          victim_account_no: undefined,
          mule_account_no: undefined,
        }),
      })
      .select('id, complaint_id, status')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A complaint with this acknowledgement number already exists.' }, { status: 409 })
      }
      console.error('Supabase complaint insert failed:', error)
      return NextResponse.json({ error: 'Unable to save complaint.' }, { status: 500 })
    }

    return NextResponse.json({ complaint_id: data.complaint_id, acknowledgement_no: data.complaint_id, status: data.status }, { status: 201 })
  } catch (error) {
    console.error('Complaint submission failed:', error)
    return NextResponse.json({ error: 'Unable to save complaint. Check the server configuration.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const complaintId = new URL(request.url).searchParams.get('id')?.trim()

  try {
    const supabase = getSupabase()
    if (!complaintId) {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, complaint_id, complaint_date, crime_category, state, district, city, amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Supabase complaint list failed:', error)
        return NextResponse.json({ error: 'Unable to fetch complaints.' }, { status: 500 })
      }

      return NextResponse.json({ complaints: data })
    }

    const { data, error } = await supabase
      .from('complaints')
      .select('complaint_id, status, complaint_date, crime_category, amount, state, district')
      .eq('complaint_id', complaintId)
      .maybeSingle()

    if (error) {
      console.error('Supabase complaint lookup failed:', error)
      return NextResponse.json({ error: 'Unable to fetch complaint.' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Complaint not found.' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Complaint lookup failed:', error)
    return NextResponse.json({ error: 'Unable to fetch complaint. Check the server configuration.' }, { status: 500 })
  }
}
