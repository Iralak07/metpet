const express = require('express');
const axios = require('axios');
require('dotenv').config(); // Opcional por si pruebas en local

const app = express();
app.use(express.json());

// Variables de entorno que configuraremos en Render
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const API_TOKEN = process.env.API_TOKEN;
const BUSINESS_PHONE = process.env.BUSINESS_PHONE;
const API_VERSION = process.env.API_VERSION || 'v25.0';

// 1. Verificación del Webhook (Paso 3 de la guía de Meta)
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED SUCCESSFULLY');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// 2. Recepción de mensajes y envío de respuestas (Paso 4 de la guía de Meta)
app.post('/', async (req, res) => {
  console.log('Webhook payload received:', JSON.stringify(req.body, null, 2));
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Extraer el mensaje usando la estructura oficial del payload de WhatsApp
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  // Comprobar si es un mensaje de texto válido de un usuario
  if (message?.type === 'text') {
    try {
      // Responder al usuario (Mensaje tipo Echo)
      await axios({
        method: 'POST',
        url: `https://facebook.com{API_VERSION}/${BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to: message.from,
          text: { body: "Echo: " + message.text.body },
          context: {
            message_id: message.id // Vincula la respuesta al mensaje original
          }
        }
      });

      console.log(`Respuesta enviada con éxito a: ${message.from}`);

      // Opcional: Marcar el mensaje entrante como leído
      await axios({
        method: 'POST',
        url: `https://facebook.com{API_VERSION}/${BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: message.id
        }
      });

    } catch (error) {
      console.error('Error al interactuar con la API de WhatsApp:', error.response?.data || error.message);
    }
  }

  // Siempre responder con 200 OK inmediatamente a Meta para evitar reintentos duplicados
  res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`\nServer listening on port ${PORT}\n`);
});