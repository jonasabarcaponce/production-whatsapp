require('dotenv').config();

const express = require('express');
const venom = require('venom-bot');
const axios = require('axios');

const app = express();
const port = 3000;

let venomClient;

const incomingMessageUrl = 'https://cgdesarrollos.mx/save-message';
const incomingMediaUrl = 'https://cgdesarrollos.mx/save-media';

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create a session when the server starts
venom
  .create({ session: 'session-name' })
  .then((client) => {
    venomClient = client;
    console.log('✅ Sesión de Venom iniciada');
    startListening(client);
    startKeepAlive();
  })
  .catch((erro) => {
    console.log('❌ Error al iniciar la sesión de Venom: ', erro);
  });

// Function to listen to incoming WhatsApp messages
function startListening(client) {
  client.onMessage(async (message) => {
    console.log('Mensaje recibido: ', message.body);

    if (!message.isGroupMsg) {
      if (message.body) {

        await postToServer(incomingMessageUrl, {
          from: message.from,
          body: message.body,
          timestamp: message.timestamp,
        });

        if (message.body === 'Hola') {
          await sendTextMessage(message.from, 'Gracias por escribir a CGDesarrollos 👷. Te estaremos contactando lo mas pronto posible por este medio.');
        }
        if (message.body === '¡Hola! Quiero más información.') {
          await sendTextMessage(message.from, 'Gracias por escribir a CGDesarrollos 👷. Te estaremos contactando lo mas pronto posible por este medio.');
        }

      } 
      else {
        // Message is undefined so please dump it. 
        console.log('❌ Mensaje indefinido: ', message);
        await postToServer(incomingMessageUrl, {
          from: message.from,
          body: message.body ?? message.content ?? message.matchedText ?? null,
          timestamp: message.timestamp,
        });
      }
    }

    if (!message.isGroupMsg && message.isMedia || message.isMMS) {
      await postToServer(incomingMediaUrl, {
        from: message.from,
        mimetype: message.mimetype,
        filename: message.filename,
        timestamp: message.timestamp,
      });
    }
  });
}

// Function to post data to the server
async function postToServer(url, data) {
  try {
    const response = await axios.post(url, data);
    console.log('✅ Publicado en el servidor:', response.data);
  } catch (error) {
    console.error('❌ Error al publicar en el servidor:', error);
  }
}

// Function to send a text message
async function sendTextMessage(to, message) {
  try {
    const result = await venomClient.sendText(to, message);
    console.log('✅ Mensaje enviado exitosamente:', result);
  } catch (erro) {
    console.error('❌ Error al enviar el mensaje:', erro);
  }
}

// Function to send a text message
function sendMessage(to, message, res) {
  venomClient
    .sendText(to, message)
    .then((result) => {
      res.status(200).json({ status: 'success', data: result });
    })
    .catch((erro) => {
      res.status(500).json({ status: 'error', message: erro.toString() });
    });
}

// Function to send an image
function sendImage(to, imageUrl, caption, res) {
  venomClient
    .sendImage(to, imageUrl, 'image', caption)
    .then((result) => {
      res.status(200).json({ status: 'success', data: result });
    })
    .catch((erro) => {
      res.status(500).json({ status: 'error', message: erro.toString() });
    });
}

// Function to send a location
function sendLocation(to, latitude, longitude, title, res) {
  venomClient
    .sendLocation(to, latitude, longitude, title)
    .then((result) => {
      res.status(200).json({ status: 'success', data: result });
    })
    .catch((erro) => {
      res.status(200).json({ status: 'error', message: erro.toString() });
    });
}

// Function to send a file
function sendFile(to, filePath, fileName, caption, res) {
  venomClient
    .sendFile(to, filePath, fileName, caption)
    .then((result) => {
      res.status(200).json({ status: 'success', data: result });
    })
    .catch((erro) => {
      res.status(500).json({ status: 'error', message: erro.toString() });
    });
}

// API route to send a WhatsApp message using POST
app.post('/send-message', (req, res) => {
  const { to, message } = req.body;
  if (venomClient) {
    sendMessage(to, message, res);
  } else {
    res.status(500).json({ status: 'error', message: '❌ Cliente de Venom no inicializado' });
  }
});

// API route to send an image using POST
app.post('/send-image', (req, res) => {
  const { to, imageUrl, caption } = req.body;
  if (venomClient) {
    sendImage(to, imageUrl, caption, res);
  } else {
    res.status(500).json({ status: 'error', message: '❌ Cliente de Venom no inicializado' });
  }
});

// API route to send a location using POST
app.post('/send-location', (req, res) => {
  const { to, latitude, longitude, title } = req.body;
  if (venomClient) {
    sendLocation(to, latitude, longitude, title, res);
  } else {
    res.status(500).json({ status: 'error', message: '❌ Cliente de Venom no inicializado' });
  }
});

// API route to send a file using POST
app.post('/send-file', (req, res) => {
  const { to, filePath, fileName, caption } = req.body;
  if (venomClient) {
    sendFile(to, filePath, fileName, caption, res);
  } else {
    res.status(500).json({ status: 'error', message: '✅ Cliente de Venom no inicializado' });
  }
});

// API route to check the status using GET
app.get('/status', (req, res) => {
  if (venomClient) {
    res.status(200).json({ status: 'success', message: '✅ Cliente de Venom está activo' });
  } else {
    res.status(500).json({ status: 'error', message: '❌ Cliente de Venom no inicializado' });
  }
});

// Function to send a ping message to keep the client alive
async function sendPing() {
  if (venomClient) {
    try {
      const uniqueId = Date.now();
      const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Cancun' });
      const pingMessage = `Ping desde el servidor de WhatsApp 🏓\nIdentificador: ${uniqueId}\nFecha y hora: ${timestamp}`;
      await venomClient.sendText('5219982004041@c.us', pingMessage);
      console.log('Ping enviado exitosamente. 🏓 a las ' + timestamp);
    } catch (erro) {
      console.error('Error al enviar el ping: ❌', erro);
      process.exit();
    }
  }
}

// Function to start the keep-alive mechanism
function startKeepAlive() {
  setInterval(sendPing, 5 * 60 * 1000); // Send a ping every 5 minutes
}

// Start the Express server
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
