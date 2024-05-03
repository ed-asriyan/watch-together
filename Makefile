IMAGE_NAME=watchtogether.online
RUN_DEV_PARAMS=--workdir /app -v .:/app -it --rm 
ENV_FILE=.env
DOCKER_DEV_IMAGE_NAME=watch-together-dev
DOCKER_STAGING_IMAGE_NAME=watch-together-staging
DOCKER_PROD_BUNDLE_IMAGE_NAME=watch-together-app
TMP_CONTAINER_NAME=watch-together-tmp

build_dev_image:
	docker build -t ${DOCKER_DEV_IMAGE_NAME} --target dev .

build_staging_image:
	docker build $$(./buildargs.sh ${ENV_FILE}) --build-arg NODE_ENV=staging -t ${DOCKER_STAGING_IMAGE_NAME} --target app .

build_prod_bundle_image:
	docker build $$(./buildargs.sh ${ENV_FILE}) --build-arg NODE_ENV=production -t ${DOCKER_PROD_BUNDLE_IMAGE_NAME} --target bundle .

dev_install: build_dev_image
	docker run ${RUN_DEV_PARAMS} ${DOCKER_DEV_IMAGE_NAME} sh -c "npm ci && npm i --no-save @rollup/rollup-linux-arm64-gnu"

dev_serve:
	docker run ${RUN_DEV_PARAMS} -p 5173:5173 --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} npm run dev -- --host

dev_enter:
	docker run ${RUN_DEV_PARAMS} --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} bash

dev_stats: build_dev_image
	docker run ${RUN_DEV_PARAMS} --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} npm run stats -- --host > stats.tsv

dev_clean_db: build_dev_image
	docker run --workdir /app -v .:/app --rm --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} npm run clean-db -- 2678400 # 31 day

staging_serve: build_staging_image
	docker run -it --rm -p 8080:80 ${DOCKER_STAGING_IMAGE_NAME}

prod_build_bundle: build_prod_bundle_image
	docker create --name ${TMP_CONTAINER_NAME} ${DOCKER_PROD_BUNDLE_IMAGE_NAME}
	docker cp ${TMP_CONTAINER_NAME}:/dist ./dist
	docker rm ${TMP_CONTAINER_NAME}
