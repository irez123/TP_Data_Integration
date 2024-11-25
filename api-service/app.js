const express = require('express');
const { Kafka } = require('kafkajs');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser'); // Import du parseur CSV
const hdfs = require('webhdfs'); // Import de WebHDFS pour HDFS
const axios = require('axios'); // Import d'Axios pour Spark API

const app = express();
const port = 5000;

app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Configuration de Kafka
const kafka = new Kafka({
  clientId: 'api-service',
  brokers: ['kafka:9092'], 
});

// Initialisation du producteur Kafka
const producer = kafka.producer();
let producerReady = false;

const connectProducer = async () => {
  if (!producerReady) {
    try {
      await producer.connect();
      producerReady = true;
      console.log('Kafka producer connected');
    } catch (error) {
      console.error('Error connecting Kafka producer:', error);
      producerReady = false;
    }
  }
};

// Configuration de HDFS
const hdfsClient = hdfs.createClient({
  user: 'root', // Nom de l'utilisateur pour HDFS
  host: 'hadoop-namenode', // Nom du service HDFS dans Docker
  port: 9870, // Port WebHDFS
  path: '/webhdfs/v1', // Chemin de l'API WebHDFS
});

// Configuration Spark
const SPARK_MASTER_URL = 'http://spark-master:8080'; // URL du Spark Master REST API

app.get('/', (req, res) => {
  res.send('Welcome to the API Service! Use /api/send-to-kafka, /api/metrics, /api/read-from-hdfs, or /api/spark-metrics');
});
app.post('/api/send-file-to-kafka', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;

  try {
    const messages = [];

    fs.createReadStream(filePath)
      .pipe(csv()) // Convertit chaque ligne du CSV en un objet JSON
      .on('data', (row) => {
        messages.push({ value: JSON.stringify(row) });
      })
      .on('end', async () => {
        // Une fois la lecture terminée, envoyer les messages à Kafka
        await connectProducer();

        await producer.send({
          topic: 'total-population',
          messages: messages,
        });

        // Supprimer le fichier temporaire
        fs.unlinkSync(filePath);

        res.json({ message: 'CSV data sent to Kafka successfully' });
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        res.status(500).json({ error: 'Failed to process CSV file' });
      });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process and send file data to Kafka' });
  }
});

// Route GET pour lire un fichier depuis HDFS
app.get('/api/read-from-hdfs', (req, res) => {
  const { filePath } = req.query; // Path HDFS attendu dans les paramètres de la requête

  if (!filePath) {
    return res.status(400).json({ error: 'Missing filePath query parameter' });
  }

  const hdfsStream = hdfsClient.createReadStream(filePath);

  let data = '';
  hdfsStream
    .on('data', (chunk) => {
      data += chunk.toString(); // Stockage des données
    })
    .on('end', () => {
      res.send(data); // Retourne le contenu brut du fichier
    })
    .on('error', (error) => {
      console.error('Error reading from HDFS:', error);
      res.status(500).json({ error: 'Failed to read file from HDFS' });
    });
});

// Route GET pour récupérer des métriques Spark
app.get('/api/spark-metrics', async (req, res) => {
  try {
    const response = await axios.get(`${SPARK_MASTER_URL}/api/v1/applications`);
    const applications = response.data;

    if (!applications.length) {
      return res.json({ message: 'No active Spark applications found' });
    }

    const metrics = applications.map((app) => ({
      appId: app.id,
      name: app.name,
      startTime: app.startTime,
      duration: app.duration,
      status: app.attempts[0].completed ? 'Completed' : 'Running',
    }));

    res.json({ sparkApplications: metrics });
  } catch (error) {
    console.error('Error fetching Spark metrics:', error);
    res.status(500).json({ error: 'Failed to fetch Spark metrics' });
  }
});

// On simule le calcul de nos métriques ici
app.get('/api/metrics', (req, res) => {
  const metrics = {
    averageIncome: 50000,
    populationCount: 1000000,
  };

  res.json(metrics);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, async () => {
  console.log(`API service listening at http://localhost:${port}`);
  await connectProducer(); // Connecter le producteur au démarrage
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (producerReady) {
    await producer.disconnect();
    console.log('Kafka producer disconnected');
  }
  process.exit();
});
