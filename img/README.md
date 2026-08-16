docker  rm -f ssj-worker && docker build -t ssj-worker .


docker run -d \
  -e GITHUB_USER="vipul-mehtalogy" \
  -e GITHUB_TOKEN="_11AAXNWUY0XqGDnRdNPjOh_JfHFzaPBzj4hymEkEYxL109WQsR6BbqTMOl8gaRCS1HJLV6PUY33ezxsJzE" \
  --name ssj-worker ssj-worker


docker logs -f ssj-worker

docker exec -it ssj-worker bash

cat /var/log/rates.log

tail -f /var/log/cron.log
tail -f /var/log/rates.log

