build-server-image:
    podman build -f Dockerfile.server -t llxq-server .

build-client-image serverUrl:
    podman build --build-arg LLXQ_SERVER_URL={{serverUrl}} -f Dockerfile.client -t llxq-client .


up:
    podman run -d -p 3000:3000 llxq-server
    podman run -d -p 8080:8080 llxq-client
