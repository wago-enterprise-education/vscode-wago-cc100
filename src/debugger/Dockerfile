
#FROM arm32v7/python:alpine3.10

#WORKDIR /app

#RUN apk --no-cache --no-progress --update add --repository http://dl-cdn.alpinelinux.org/alpine/v3.21/main \
#    ca-certificates 

#RUN pip install debugpy 

#RUN mkdir -p /app/bindvolumen

# RUN python3 -m pip install -e /app/lib 

#COPY debugmain.sh /app

#COPY main.py /app

#COPY lib /app/lib

#COPY debugstart.sh /app

#RUN chmod +x debugstart.sh
#RUN chmod +x /app/debugmain.sh

#CMD [ "/app/debugstart.sh"]

#konkrete Version benutzen 
FROM arm32v7/python:3.13-slim@sha256:199fde387e7176f35fe281ff1c9dbca065b896a717ec63f90e69d82f6efc89e6 AS compile
WORKDIR /home/user/python_bootapplication

ADD ["https://github.com/wago-enterprise-education/wago_cc100_python.git", "./wago_cc100_python"]

#installing CC100 Python library
RUN cd wago_cc100_python/ && \
    pip install --user . && \
    pip install --user debugpy

#Build
FROM arm32v7/python:3.13-slim AS build
LABEL maintainer="louis.krumme@wago.com"
LABEL image_version="0.1"
LABEL extension_version="0.2"
WORKDIR /home/user/python_bootapplication

#debugpy
EXPOSE 5678

# Copying dependencies 
COPY liboms/* /usr/lib
COPY --from=compile /root/.local /root/.local

# getting psmisc for killall
RUN apt-get update && apt-get install -y --no-install-recommends \
    psmisc && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

ENV PATH=/root/.local/bin:$PATH
CMD ["python3","lib/runtimeCC.py"]