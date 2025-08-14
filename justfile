build-server-image:
    podman build -f Dockerfile.server -t llxq-server .

build-client-image serverUrl:
    podman build --build-arg LLXQ_SERVER_URL={{serverUrl}} -f Dockerfile.client -t llxq-client .
