IMAGE_NAME=watchtogether.online
DEV_RUN_PARAMS=--workdir /app -v .:/app --rm -it
DEV_INSTALL_COMMAND=npm ci && npm i --no-save @rollup/rollup-linux-arm64-gnu firebase-admin
CI_RUN_PARAMS=--workdir /app -v .:/app --rm
CI_INSTALL_COMMAND=npm ci && npm i --no-save firebase-admin
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
	docker run ${DEV_RUN_PARAMS} ${DOCKER_DEV_IMAGE_NAME} sh -c "${DEV_INSTALL_COMMAND}"

dev_serve:
	docker run ${DEV_RUN_PARAMS} -p 5173:5173 --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} npm run dev -- --host

dev_enter:
	docker run ${DEV_RUN_PARAMS} --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} bash

dev_stats:
	docker run ${DEV_RUN_PARAMS} --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} npm run stats -- --host > stats.tsv

dev_clean_db:
	docker run --workdir /app -v .:/app --rm --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} npm run clean-db -- 2678400 # 31 day

ci_install: build_dev_image
	docker run ${CI_RUN_PARAMS} ${DOCKER_DEV_IMAGE_NAME} sh -c "${CI_INSTALL_COMMAND}"

ci_clean_db:
	docker run --workdir /app -v .:/app --rm --env-file ${ENV_FILE} ${DOCKER_DEV_IMAGE_NAME} npm run clean-db -- 2678400 # 31 day

staging_serve: build_staging_image
	docker run -it --rm -p 8080:80 ${DOCKER_STAGING_IMAGE_NAME}

prod_build_bundle: build_prod_bundle_image
	docker create --name ${TMP_CONTAINER_NAME} ${DOCKER_PROD_BUNDLE_IMAGE_NAME}
	docker cp ${TMP_CONTAINER_NAME}:/dist ./dist
	docker rm ${TMP_CONTAINER_NAME}
