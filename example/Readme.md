
## Type-check

## Test on Linux

```bash
docker compose build
docker compose run -i --rm linux_dev
# inside the container
cd example/
. ./local-setup.sh
# test installed packages
exit
# back on the host
docker volume rm example_dot_local
docker volume rm example_dot_cache
rm ../.bash_history
```
