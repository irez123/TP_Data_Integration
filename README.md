
---

## 1. **Lancement du projet Docker**

Bien penser à changer les répertoires dans tout le projet
```bash
cd C:\Users\LENOVO\Documents\TP_DataIntegration
docker compose up -d
```
---

## 2. **Kafka**

Kafka étant un système de gestion de flux de données, nous commençons par créer un *topic* dans lequel nous allons publier les données.

### a. Création d'un topic Kafka

```bash
docker exec -it kafka kafka-topics --create \
    --topic total-population \
    --bootstrap-server localhost:9092 \
    --partitions 1 \
    --replication-factor 1
```

Cette commande permet de créer un *topic* Kafka nommé `total-population` :

- **--topic total-population** : Nomme le topic Kafka `total-population`, où les données seront envoyées.
- **--partitions 1** : Configure Kafka pour utiliser une seule partition pour ce topic, ce qui est suffisant dans un cadre de test ou pour des volumes de données modestes.
- **--replication-factor 1** : Indique que la réplication des données est assurée sur un seul nœud, ce qui est une configuration simple pour un environnement de test.

### b. Création d'un répertoire pour les données dans Kafka

Ensuite, pour pouvoir y copier des fichiers depuis l'hôte local, nous créons un répertoire à l'intérieur du conteneur Kafka :

```bash
docker exec -it kafka mkdir -p /tmp/data
```

- **mkdir -p /tmp/data** : Crée le répertoire `/tmp/data` dans le conteneur Kafka, permettant de stocker les fichiers qui seront envoyés au *topic*.

### c. Copier le fichier CSV dans le conteneur Kafka

Nous copions ensuite le fichier CSV, `total-population.csv`, depuis notre machine locale vers le répertoire nouvellement créé à l’intérieur du conteneur Kafka :

```bash
docker cp C:/Users/LENOVO/Documents/TP_DataIntegration/total-population.csv kafka:/tmp/data/total-population.csv
```

- **docker cp** : Copie le fichier spécifié de l'hôte local vers le conteneur Kafka, afin que ce dernier puisse le traiter et envoyer les données dans le *topic*.

### d. Vérification du fichier copié

Une fois le fichier copié, nous pouvons vérifier qu'il se trouve bien dans le répertoire `/tmp/data` du conteneur Kafka :

```bash
docker exec -it kafka ls -l /tmp/data
```

- **ls -l** : Affiche la liste détaillée des fichiers présents dans le répertoire `/tmp/data` à l'intérieur du conteneur Kafka.

### e. Envoi du fichier CSV vers Kafka

Enfin, pour envoyer les données du fichier CSV dans le topic Kafka, on utilise un producteur Kafka :

```bash
docker exec -i kafka kafka-console-producer \
    --broker-list localhost:9092 \
    --topic total-population < /tmp/data/total-population.csv
```

- **kafka-console-producer** : Ouvre une session de producteur Kafka, permettant de publier des messages dans un topic.
- **--broker-list localhost:9092** : Spécifie le broker Kafka à utiliser pour établir la connexion (ici, nous nous connectons à `localhost` sur le port `9092`).
- **--topic total-population** : Définit le *topic* dans lequel les messages (données) seront envoyés.
- **< /tmp/data/total-population.csv** : Cette syntaxe redirige le contenu du fichier CSV vers le producteur Kafka pour qu'il soit publié dans le topic.

### f. Vérification du contenu du fichier

Pour s'assurer que les données sont bien présentes dans le fichier, nous utilisons la commande suivante pour afficher le contenu du fichier :

```bash
docker exec -it kafka cat /tmp/data/total-population.csv
```

- **cat** : Permet d'afficher le contenu du fichier `total-population.csv` directement dans le terminal.

---

### g. Bonus API

Il est également possible, via le http://localhost:5000/ de lire les données Kafka, nous avons également simulé certaines métriques.
---

## 3. **Spark**

### a. Accès au conteneur Hadoop

Afin de manipuler les données stockées dans le système de fichiers HDFS de Hadoop, nous commençons par accéder au conteneur `hadoop-namenode` :

```bash
docker exec -it hadoop-namenode bash
```

- **bash** : Lance une session Bash dans le conteneur `hadoop-namenode`, nous permettant d'interagir avec Hadoop.

### b. Lister les fichiers présents dans HDFS

Avant de manipuler les données, nous pouvons lister les fichiers présents sur HDFS :

```bash
hdfs dfs -ls /data
```

- **hdfs dfs -ls /data** : Liste les fichiers présents dans le répertoire `/data` de HDFS, où sont stockées les données.

### c. Créer un répertoire sur HDFS

Si le répertoire `/data` n'existe pas encore, nous le créons avec la commande suivante :

```bash
hdfs dfs -mkdir -p /data
```

- **hdfs dfs -mkdir -p /data** : Crée un répertoire `/data` sur HDFS. L'option `-p` permet de ne pas renvoyer d'erreur si le répertoire existe déjà.

### d. Accès au conteneur Spark

Ensuite, nous accédons au conteneur `spark-master` pour interagir avec Spark et manipuler les données :

```bash
docker exec -it spark-master /bin/bash
```

### e. Lancer le shell interactif Spark

Nous démarrons ensuite un shell Spark interactif, ce qui nous permet d'exécuter des commandes Spark directement dans l'environnement distribué :

```bash
spark-shell --master spark://spark-master:7077
```

- **spark-shell --master** : Lance le shell interactif de Spark, avec le maître de cluster Spark spécifié à l'adresse `spark-master:7077`.

### f. Lire un fichier CSV depuis HDFS dans Spark

Une fois le shell Spark lancé, nous lisons un fichier CSV stocké sur HDFS et affichons son contenu :

```scala
val df = spark.read.option("header", "true").csv("hdfs://hadoop-namenode:9000/data/aggregate.csv")
df.show()
```

- **spark.read.option("header", "true").csv** : Charge le fichier CSV en précisant que la première ligne contient les noms de colonnes.
- **df.show()** : Affiche les premières lignes du fichier CSV dans le shell Spark.

---

## 4. **MongoDB**

### a. Lancer MongoDB dans un conteneur Docker

Pour gérer les données via une base de données NoSQL, nous utilisons MongoDB. La commande suivante permet de démarrer MongoDB dans un conteneur Docker, cette partie n'a pas été terminée :

```bash
docker run -d --name mongodb -p 27017:27017 -v C:/Users/LENOVO/Documents/TP_DataIntegration/mongo-data:/data/db mongo
```

- **docker run -d** : Lance un conteneur MongoDB en mode détaché.
- **--name mongodb** : Nomme le conteneur `mongodb`.
- **-p 27017:27017** : Mappe le port 27017 du conteneur sur celui de l'hôte, permettant l'accès à MongoDB via `localhost:27017`.
- **-v /path/to/data:/data/db** : Monte un volume de données pour MongoDB, permettant de conserver les données entre les redémarrages du conteneur.

### b. Accéder à MongoDB via le shell

Une fois MongoDB en cours d'exécution, cette commande permet d'accéder au shell MongoDB à l'intérieur du conteneur :

```bash
docker exec -it mongodb mongo
```

- **docker exec -it mongodb mongo** : Ouvre une session MongoDB à l'intérieur du conteneur, permettant d'interagir avec la base de données.

---

