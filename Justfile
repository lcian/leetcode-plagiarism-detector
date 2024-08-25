set shell := ["bash", "-cu"]

generate-client:
    mvn -f backend verify -B
    .venv/bin/openapi-python-client generate --path backend/target/openapi.json --meta setup
    mv open-api-definition-client/open_api_definition_client open-api-definition-client/api_client
    mv open-api-definition-client api_client
    sed -i 's/open_api_definition_client/api_client/g' api_client/setup.py
    rm -Rf data/api_client
    mv api_client data
    cd data && .direnv/python-3.10/bin/./pip3 install -r requirements.txt
