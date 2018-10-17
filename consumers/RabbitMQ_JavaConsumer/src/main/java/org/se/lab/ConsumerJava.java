package org.se.lab;

import com.rabbitmq.client.*;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

import org.json.*;

public class ConsumerJava {
    private static final String returnQueueName = "ConsumerReturnQueue";
    private static final String nodejsQueueName = "NodePublishQueueDB";
    private static final String exchangeName = "ServermonExchange";
    private static final String routingKeyReturnQueue = "rountingKeyReturnQueue";
    private static final String routingKeyNodeQueue = "routingKeyDB";
    private static final String hostName = "localhost";

    public static void main(String[] argv) {
        try {
            consumeFromNodePublishQueue();
        }
        catch(Exception ex) {
            ex.printStackTrace();
        }
    }

    public static void consumeFromNodePublishQueue() throws Exception {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost(hostName);
        Connection connection = factory.newConnection();
        Channel channel = connection.createChannel();
        channel.exchangeDeclare(exchangeName, BuiltinExchangeType.DIRECT);
        channel.queueDeclare(nodejsQueueName, true, false, false, null);
        channel.queueBind(nodejsQueueName, exchangeName, routingKeyNodeQueue);
        System.out.println(" [*] Waiting for messages from NodePublishQueueDB. To exit press CTRL+C");

        Consumer consumer = new DefaultConsumer(channel) {
            @Override
            public void handleDelivery(String consumerTag, Envelope envelope,
                                       AMQP.BasicProperties properties, byte[] body) throws IOException {

                String message = new String(body, "UTF-8");
                System.out.println(" [x] Received '" + envelope.getRoutingKey() + "':'" + message + "'");

                JSONObject obj = new JSONObject(message);
                String nodejsTimeStartText =  obj.getString("nodejsTimeStart");

                Calendar cal = Calendar.getInstance();
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.GERMAN);

                long nodejsTimeStart;
                try {
                    nodejsTimeStart = sdf.parse(nodejsTimeStartText).getTime();
                }
                catch(Exception ex) {
                    nodejsTimeStart = 0;
                }

                int numberIterations = 1;
                long duration = new UserDAOTest(numberIterations).ProduceDBload();

                System.out.println(System.currentTimeMillis());
                System.out.println(nodejsTimeStart);

                long overallDuration = System.currentTimeMillis() - nodejsTimeStart;
                String returnMessage = obj.toString();

                try {
                    PublisherJava pj = new PublisherJava(hostName, exchangeName, returnQueueName, returnMessage);
                }
                catch(Exception ex) {
                    ex.printStackTrace();
                }
            }
        };
        channel.basicConsume(nodejsQueueName, true, consumer);
    }
}