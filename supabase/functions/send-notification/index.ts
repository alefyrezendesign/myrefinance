import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')

serve(async (req) => {
  try {
    const { type, categoryName, percentage, userId, title: customTitle, message: customMessage } = await req.json()

    let title = customTitle || ""
    let message = customMessage || ""

    if (type === 'limite_85') {
      title = "🛑 Atenção ao limite!"
      message = `Você já atingiu ${percentage}% do seu limite de gastos para a categoria "${categoryName}" neste mês. Pisa no freio!`
    }

    if (!title || !message) {
        return new Response(JSON.stringify({ error: "Title or Message missing" }), { status: 400 })
    }

    console.log(`Sending ${type} notification to user ${userId}`)
    console.log(`OneSignal App ID: ${ONESIGNAL_APP_ID ? 'SET' : 'MISSING'}`)
    console.log(`OneSignal API Key: ${ONESIGNAL_API_KEY ? 'SET' : 'MISSING'}`)

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        // Use include_aliases instead of deprecated include_external_user_ids
        include_aliases: { external_id: [userId] },
        target_channel: "push",
        headings: { en: title, pt: title },
        contents: { en: message, pt: message }
      })
    })

    const result = await response.json()
    console.log('OneSignal API response:', JSON.stringify(result))
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } })
  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
