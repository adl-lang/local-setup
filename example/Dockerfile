FROM ubuntu:22.04

RUN apt-get update && apt-get install -y curl unzip
RUN apt-get install -y xz-utils

RUN useradd -ms /bin/bash appuser
WORKDIR /home/appuser
USER appuser
RUN mkdir -p /home/appuser/example/.local 
RUN mkdir -p /home/appuser/.cache
# make this a volume belonging to the appuser
VOLUME "/home/appuser/example/.local"
VOLUME "/home/appuser/.cache"

CMD [ "/bin/bash" ]