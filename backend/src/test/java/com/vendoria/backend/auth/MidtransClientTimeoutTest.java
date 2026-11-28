package com.vendoria.backend.auth;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClientException;

class MidtransClientTimeoutTest {
    @Test void aSilentServerCannotHoldTheCallerForever() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> { }); // menerima permintaan, tak pernah menjawab
        server.start();
        try {
            var client = MidtransClient.client("http://127.0.0.1:" + server.getAddress().getPort(), Duration.ofMillis(300));
            assertTimeoutPreemptively(Duration.ofSeconds(5), () -> assertThrows(RestClientException.class,
                () -> client.get().uri("/status").retrieve().body(String.class)));
        } finally { server.stop(0); }
    }
}
