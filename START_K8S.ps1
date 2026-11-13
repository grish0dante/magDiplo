$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$context = kubectl config current-context
Write-Host "Kubernetes context: $context"
if ($context -ne 'docker-desktop') { throw 'Expected docker-desktop context; select it explicitly before running.' }
if (-not (Test-Path .\.env)) { throw 'Create .env with AUTH_SECRET and WORKER_SECRET first (see .env.example).' }
$vars = @{}
Get-Content .\.env | ForEach-Object {
  if ($_ -match '^\s*(AUTH_SECRET|WORKER_SECRET)=(.*)$') { $vars[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'") }
}
if (-not $vars.AUTH_SECRET -or -not $vars.WORKER_SECRET) { throw 'Missing AUTH_SECRET or WORKER_SECRET in .env' }
kubectl apply -f .\infrastructure\k8s\namespace.yaml
if ($LASTEXITCODE -ne 0) { throw 'Failed to create namespace' }
# apply is idempotent; secret stays out of source control
kubectl -n marching-cubes create secret generic marching-secrets --from-literal="AUTH_SECRET=$($vars.AUTH_SECRET)" --from-literal="WORKER_SECRET=$($vars.WORKER_SECRET)" --dry-run=client -o yaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw 'Failed to apply secret' }
foreach ($name in @('backend','worker','frontend')) {
  docker build -t "marching-cubes-${name}:local" -f "${name}/Dockerfile" .
  if ($LASTEXITCODE -ne 0) { throw "Docker build failed: $name" }
}
foreach ($name in @('redis','mongo','backend','frontend','worker-deployment')) {
  kubectl apply -f ".\infrastructure\k8s\${name}.yaml"
  if ($LASTEXITCODE -ne 0) { throw "Apply failed: $name" }
}
foreach ($name in @('redis','mongo','backend','frontend','marching-workers')) {
  $deployment = if ($name -eq 'marching-workers') { $name } else { $name }
  kubectl -n marching-cubes rollout restart "deployment/$deployment"
  kubectl -n marching-cubes rollout status "deployment/$deployment" --timeout=180s
  if ($LASTEXITCODE -ne 0) { throw "Deployment not ready: $deployment. Check kubectl describe pods." }
}
if (-not (kubectl get crd scaledobjects.keda.sh --ignore-not-found)) { throw 'KEDA CRD not installed; install KEDA via Helm first.' }
kubectl apply -f .\infrastructure\k8s\worker-scaledobject.yaml
kubectl -n marching-cubes get pods,scaledobject,hpa
Write-Host 'In two other terminals: kubectl -n marching-cubes port-forward svc/frontend-service 5173:5173 and kubectl -n marching-cubes port-forward svc/backend-service 3000:3000'
