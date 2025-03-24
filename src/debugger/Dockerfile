# konkrete Version benutzen 

#FROM arm32v7/python:alpine3.10

#WORKDIR /app

#RUN apk --no-cache --no-progress --update add --repository http://dl-cdn.alpinelinux.org/alpine/v3.21/main \
#    ca-certificates \
#    openssl \
#    curl && \
#    mkdir -p /usr/local/share/ca-certificates/wago-certs && \
#    curl -ksSL https://artifactory.wago.local/certs-generic-prod/wago-root-certificates/IssuingCA-SVCA01002-SHA256-base64.crt -o /usr/local/share/ca-certificates/wago-certs/IssuingCA-SVCA01002-SHA256-base64.crt && \
#    curl -ksSL https://artifactory.wago.local/certs-generic-prod/wago-root-certificates/RootCA-SVCA01001-SHA256-base64.crt -o /usr/local/share/ca-certificates/wago-certs/RootCA-SVCA01001-SHA256-base64.crt && \
#    cp /usr/local/share/ca-certificates/wago-certs/* /usr/local/share/ca-certificates && \
#    update-ca-certificates && \
#    apk --no-cache --no-progress --update add \
#    rm -rf /usr/share/doc /usr/share/man /usr/share/locale /tmp/* 

#RUN pip install debugpy    

#COPY main.py /app/

#COPY lib /app/lib

#RUN python3 -m pip install -e /app/lib && \
#    rm -rf /etc/ssl/certs /etc/ssl/private


#ENV PYTHONPATH="/app/lib"

#CMD ["python3","/app/main.py"]

FROM arm32v7/python:alpine3.10

WORKDIR /app

RUN apk --no-cache --no-progress --update add --repository http://dl-cdn.alpinelinux.org/alpine/v3.21/main \
    ca-certificates 

RUN pip install debugpy 

#RUN mkdir -p /app/bindvolumen

# RUN python3 -m pip install -e /app/lib 

COPY debugmain.sh /app

COPY main.py /app

COPY lib /app/lib

COPY debugstart.sh /app

RUN chmod +x debugstart.sh
RUN chmod +x /app/debugmain.sh

CMD [ "/app/debugstart.sh"]
