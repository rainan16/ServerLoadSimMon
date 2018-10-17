package org.se.lab;

import com.rabbitmq.client.BuiltinExchangeType;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import java.io.IOException;
import java.util.concurrent.TimeoutException;

public class PublisherJava {

    public PublisherJava(String HOST, String EXCHANGE, String QUEUE_NAME, String JSON) throws IOException, TimeoutException {

        String routingKey = "rountingKeyReturnQueue";

        ConnectionFactory factory = new ConnectionFactory();

        factory.setHost(HOST);

        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();

        channel.exchangeDeclare(EXCHANGE,BuiltinExchangeType.DIRECT);
        channel.queueDeclare(QUEUE_NAME, true, false, false, null);
        channel.queueBind(QUEUE_NAME, EXCHANGE, routingKey);

        String message = JSON;
        channel.basicPublish(EXCHANGE, routingKey, null, message.getBytes("UTF-8"));

        System.out.println("ConsumerJAVA published to nodeJS " + QUEUE_NAME +": '" + message + "'");

        channel.close();
        connection.close();
    }
}
