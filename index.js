
require('dotenv').config();

const express = require('express');
const venom = require('venom-bot');
const axios = require('axios');

const app = express();
const port = 3000;

let venomClient;

const incomingMessageUrl = process.env.NODE_ENV === 'production' 
  ? 'https://cgdesarrollos.mx/save-message' 
  : 'http://cgdesarrollos.test/save-message';

// Middleware to parse JSON requests
app.use(express.json());

// Create a session when the server starts
venom
  .create({
    session: 'session-name', //name of session
  })
  .then((client) => {
    venomClient = client;
    console.log('Venom session started');
    startListening(client);
  })
  .catch((erro) => {
    console.log('Error starting Venom session: ', erro);
  });

// Function to listen to incoming WhatsApp messages
function startListening(client) {
  client.onMessage((message) => {
    console.log('Message received: ', message.body);

    // Send a POST request with the message to another server
    const data = {
      from: message.from,
      body: message.body,
      timestamp: message.timestamp,
      isGroupMsg: message.isGroupMsg,
    };

    axios
      .post(incomingMessageUrl, data)
      .then((response) => {
        console.log('Message posted to the server:', response.data);
      })
      .catch((error) => {
        console.error('Error posting message to the server:', error);
      });

    // Auto-reply to "Hola"
    if (message.body === 'Hola' && !message.isGroupMsg) {
      client
        .sendText(message.from, 'Gracias por escribir a CGDesarrollos 👷')
        .then((result) => {
          console.log('Message sent successfully.');
        })
        .catch((erro) => {
          console.error('Error sending message: ', erro);
        });
    }
  });
}

// API route to send a WhatsApp message using POST
app.post('/send-message', (req, res) => {
  const { to, message } = req.body;
  console.log('Received status: ', req.body.status);
  console.log('Received body: ', req.body);
  if (venomClient) {
    venomClient
      .sendText(to, message)
      .then((result) => {
        res.status(200).json({
          status: 'success',
          data: result
        });
      })
      .catch((erro) => {
        res.status(500).json({
          status: 'error',
          message: erro.toString()
        });
      });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Venom client not initialized'
    });
  }
});

// API route to check the status using GET
app.get('/status', (req, res) => {
  if (venomClient) {
    res.status(200).json({
      status: 'success',
      message: 'Venom client is active',
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Venom client not initialized',
    });
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
