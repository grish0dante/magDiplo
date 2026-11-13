# Kubernetes + KEDA: автоматичне масштабування Marching Cubes

## Що реалізовано

KEDA стежить за довжиною Redis-списку `bull:marching-cubes:wait` (BullMQ queue `marching-cubes`). За кожні ~20 завдань в очікуванні KEDA цілиться в одну репліку Worker, від 1 до 8. Це **масштабування за чергою**, а не за складністю формули. Враховуються лише *waiting*, а не active/delayed/paused jobs. Під час зменшення реплік Kubernetes надсилає SIGTERM; Worker має коректно завершити активне завдання. Для довгих chunks збільште `terminationGracePeriodSeconds` і перевірте час завершення.

**Важливо:** старий CPU HPA вимкнений (`legacy/worker-hpa.yaml.disabled`). Не застосовуйте його одночасно зі ScaledObject: обидва контролери керуватимуть тим самим Deployment.

## Передумови

- Docker Desktop із увімкненим Kubernetes, `kubectl`, `helm`, Node.js.
- Достатньо CPU/RAM для 8 Workers; Docker Desktop може не вмістити 8 Pod. Зменште `maxReplicaCount` до 2–4 за потреби.
- Kubernetes StorageClass за замовчуванням для PVC Redis і MongoDB.
- KEDA встановлюється окремо через Helm; маніфести самі її не встановлюють.

## Команди (PowerShell, із кореня застосунку)

```powershell
kubectl config current-context
kubectl apply -f infrastructure/k8s/namespace.yaml

# Генеруємо два різні секрети по 32 байти
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

$authBytes = New-Object byte[] 32
$workerBytes = New-Object byte[] 32

$rng.GetBytes($authBytes)
$rng.GetBytes($workerBytes)

$auth = [BitConverter]::ToString($authBytes).Replace("-", "").ToLower()
$worker = [BitConverter]::ToString($workerBytes).Replace("-", "").ToLower()


$rng.Dispose()
#записати значення в .env в корені проєкта

Write-Host "AUTH_SECRET=$auth"
Write-Host "WORKER_SECRET=$worker"


kubectl -n marching-cubes create secret generic marching-secrets --from-literal=AUTH_SECRET=$auth --from-literal=WORKER_SECRET=$worker

docker build -t marching-cubes-backend:local -f backend/Dockerfile .
docker build -t marching-cubes-worker:local -f worker/Dockerfile .
docker build -t marching-cubes-frontend:local -f frontend/Dockerfile .
# На Docker Desktop Kubernetes локальні Docker images зазвичай доступні напряму.


helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm upgrade --install keda kedacore/keda --namespace keda --create-namespace --wait

kubectl -n marching-cubes apply -f infrastructure/k8s/redis.yaml
kubectl -n marching-cubes apply -f infrastructure/k8s/mongo.yaml
kubectl -n marching-cubes apply -f infrastructure/k8s/backend.yaml
kubectl -n marching-cubes apply -f infrastructure/k8s/frontend.yaml
kubectl -n marching-cubes apply -f infrastructure/k8s/worker-deployment.yaml
kubectl -n marching-cubes apply -f infrastructure/k8s/worker-scaledobject.yaml

kubectl -n marching-cubes get pods
kubectl -n marching-cubes get scaledobject,hpa,deploy
```

Відкрийте **два окремі термінали** та залиште port-forward активними:

```powershell
kubectl -n marching-cubes port-forward svc/backend-service 3000:3000
```

```powershell
kubectl -n marching-cubes port-forward svc/frontend-service 5173:5173
```

Браузер: http://localhost:5173. Frontend у цій версії працює як Vite dev server (це локальна демонстрація, не production-конфігурація).

## Перевірка масштабування

Запустіть генерацію з великою кількістю chunks, наприклад resolution=64, chunkSize=4 (4096 chunks). У третьому терміналі:

```powershell
kubectl -n marching-cubes get hpa -w
kubectl -n marching-cubes get pods -l app=marching-worker -w
kubectl -n marching-cubes logs deploy/marching-workers --tail=40
kubectl -n marching-cubes exec deploy/redis -- redis-cli LLEN bull:marching-cubes:wait
```

Після спорожнення черги KEDA зменшить репліки з урахуванням cooldown та HPA stabilization. Якщо метрики недоступні:

```powershell
kubectl -n marching-cubes describe scaledobject marching-worker-autoscaler
kubectl -n keda logs deploy/keda-operator --tail=100
```

## Обмеження

- Redis без пароля й MongoDB без автентифікації призначені **лише для ізольованого локального Kubernetes**; не публікуйте їх у мережу.
- У цьому варіанті Redis та MongoDB мають по одному Pod із PVC, без HA.
- За промовчанням мінімум 1 Worker. Для scale-to-zero потрібні додаткові перевірки часу запуску та коректного відновлення.
- `bull:marching-cubes:wait` — правильний ключ за стандартного префікса BullMQ. Якщо зміните префікс або назву черги, змініть `listName`.
- Не запускайте Docker Compose одночасно з Kubernetes, якщо порти 3000/5173 зайняті.
- Не запускайте старий `worker-hpa.yaml` паралельно з KEDA.

