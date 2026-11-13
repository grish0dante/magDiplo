# 🚀 Запуск та розгортання

[← Головний README](../README.md)

> Команди призначені для **Windows PowerShell**. Запускайте їх із кореня `mc-social`, де розташовані `docker-compose.yml` та `START_K8S.ps1`.

## 1. Вимоги

- Docker Desktop з Linux-контейнерами; для Kubernetes — увімкнений Kubernetes.
- PowerShell, `kubectl`, Helm (для Kubernetes/KEDA).
- Node.js 22 — якщо запускатимете тести локально.
- Достатньо RAM: Frontend має ліміт `2Gi`, Worker — `2Gi` на Pod, Backend — `1Gi`. За браку ресурсів масштабування до 8 Pods не гарантоване.

## 2. Конфігурація `.env`

```powershell
Copy-Item .env.example .env
```

У `.env` мають бути два **різні** секрети:

```dotenv
AUTH_SECRET=YOUR_RANDOM_SECRET_1
WORKER_SECRET=YOUR_RANDOM_SECRET_2
```

Генератор випадкового 64-символьного hex-рядка:

```powershell
$b = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($b)
$rng.Dispose()
[BitConverter]::ToString($b).Replace("-", "").ToLower()
```

Запустіть двічі. Ніколи не додавайте `.env` у Git.

## 3. Docker Compose

```powershell
docker compose up --build -d
docker compose ps
```

Адреси:

| Сервіс | Адреса |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |

Перегляд логів:

```powershell
docker compose logs -f frontend backend worker
```

Зупинка:

```powershell
docker compose down
```

У поточному `docker-compose.yml` MongoDB і Redis не мають явних named volumes. Для збереження даних між пересозданнями контейнерів слід додати volumes і виконати резервне копіювання.

## 4. Kubernetes + KEDA

### 4.1 Увімкніть кластер

У Docker Desktop увімкніть Kubernetes і дочекайтеся його готовності.

```powershell
kubectl config current-context
kubectl get nodes
```

Очікуваний контекст скрипта: `docker-desktop`.

### 4.2 Встановіть KEDA (одноразово)

```powershell
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm upgrade --install keda kedacore/keda --namespace keda --create-namespace --wait
kubectl -n keda get pods
```

### 4.3 Запустіть проєкт

```powershell
.\START_K8S.ps1
```

Скрипт застосовує `namespace`, створює Kubernetes Secret з `.env`, збирає `backend`, `worker`, `frontend` з тегом `:local`, застосовує Deployments/Services/PVC і KEDA ScaledObject.

> Скрипт **перезапускає** Deployments. Не використовуйте його для простого перезапуску Frontend або під час активної генерації.

### 4.4 Перевірте Pods та KEDA

```powershell
kubectl -n marching-cubes get pods
kubectl -n marching-cubes get deployment
kubectl -n marching-cubes get scaledobject,hpa
```

Очікуйте `1/1 Running` для основних Pods і `READY=True` для ScaledObject. `ACTIVE=False` у KEDA нормально, якщо черга порожня.

### 4.5 Відкрийте сайт

**Термінал №1** (залишити відкритим):

```powershell
kubectl -n marching-cubes port-forward svc/frontend-service 5173:5173
```

**Термінал №2** (залишити відкритим):

```powershell
kubectl -n marching-cubes port-forward svc/backend-service 3000:3000
```

Браузер: **http://localhost:5173**. Після `rollout restart` старий `port-forward` може обірватися; просто запустіть його знову після готовності нового Pod.

## 5. Оновлення одного сервісу без перезапуску всього проєкту

**Frontend** — з новим унікальним тегом:

```powershell
docker build -t marching-cubes-frontend:ui-v6 -f frontend/Dockerfile .
kubectl -n marching-cubes set image deployment/frontend frontend=marching-cubes-frontend:ui-v6
kubectl -n marching-cubes rollout status deployment/frontend --timeout=180s
```

Після оновлення перезапустіть Frontend `port-forward`. На Docker Desktop Kubernetes Docker-образи зазвичай доступні локально; в інших кластерах потрібні registry або імпорт образу. **Не застосовуйте старий `frontend.yaml` після зміни тегу**, якщо в ньому лишився `:local`, інакше він може повернути попередній образ.

**Backend** — лише за потреби:

```powershell
docker build -t marching-cubes-backend:api-v2 -f backend/Dockerfile .
kubectl -n marching-cubes set image deployment/backend backend=marching-cubes-backend:api-v2
kubectl -n marching-cubes rollout status deployment/backend --timeout=180s
```

> `backend.yaml` містить `command: ["node", "server.js"]`; не повертайте `nodemon` у Kubernetes. У `frontend.yaml` ліміт пам'яті має залишатися `2Gi`, щоб уникнути попередньої помилки `OOMKilled` при `512Mi`.

## 6. Моніторинг автоскейлінгу

```powershell
kubectl -n marching-cubes get hpa -w
```

В іншому терміналі:

```powershell
kubectl -n marching-cubes get pods -l app=marching-worker -w
```

Перевірка черги:

```powershell
kubectl -n marching-cubes exec deployment/redis -- redis-cli LLEN bull:marching-cubes:wait
```

Параметри KEDA: `minReplicaCount=1`, `maxReplicaCount=8`, `listLength=20`, `pollingInterval=5`, `cooldownPeriod=120`. **Не застосовуйте** `worker-hpa.yaml` разом із `worker-scaledobject.yaml` — дві системи масштабування конфліктуватимуть.


