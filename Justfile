set shell := ["bash", "-cu"]

default:
    just --list

# generate Python bindings for the API
generate-client:
    mvn -f backend springdoc-openapi:1.1:generate -B
    .venv/bin/openapi-python-client generate --path backend/target/openapi.json --meta setup
    mv open-api-definition-client/open_api_definition_client open-api-definition-client/api_client
    mv open-api-definition-client api_client
    sed -i 's/open_api_definition_client/api_client/g' api_client/setup.py
    rm -Rf data/api_client
    mv api_client data
    cd data && .direnv/python-3.10/bin/./pip3 install -r requirements.txt

# deploy API and frontend to Heroku
deploy-web:
    docker build . 
    heroku container:push web
    heroku container:release web

# sync .env with Heroku
sync-env:
    heroku config:set $(cat .env | grep -v '^#' | grep -Ev '^ADDRESS|^PORT' | xargs)

# deploy data pipelines to AWS
deploy-data:
    cd infrastructure && pnpm run cdk deploy --all --require-approval never
