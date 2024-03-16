IMAGE_NAME=watchtogether.online
PARAMS=--workdir /app -v .:/app -it --rm 

install:
	docker build --target dev --tag ${IMAGE_NAME} .
	docker run ${PARAMS} ${IMAGE_NAME} sh -c "npm ci && npm i @rollup/rollup-linux-arm64-gnu"

start:
	docker run ${PARAMS} -p 5173:5173 ${IMAGE_NAME} npm run dev -- --host

stats:
	docker run ${PARAMS} -it ${IMAGE_NAME} npm run stats -- --host > stats.tsv 

enter:
	docker run ${PARAMS} -p 5173:5173 -it ${IMAGE_NAME} bash 
