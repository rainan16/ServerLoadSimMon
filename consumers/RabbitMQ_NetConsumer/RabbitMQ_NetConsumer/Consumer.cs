using System;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Runtime.Serialization;
using System.IO;
using System.Runtime.Serialization.Json;

namespace RabbitMQ_NetConsumer
{
    public class Consumer
    {
        private const String _returnQueueName = "ConsumerReturnQueue";
        private const String _nodejsQueueName = "NodePublishQueueRAM";
        private const String _exchangeName = "ServermonExchange";
        private const String _routingKeyReturnQueue = "rountingKeyReturnQueue";
        private const String _routingKeyNodeQueue = "routingKeyRAM";
        private const String _hostName = "localhost";

        public static int Main(string[] args)
        {
            try
            {
                return ReceiveFromNodeJS();
            }
            catch(Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(" An error occured:");
                Console.WriteLine(ex.Message);
                Console.WriteLine("--- STACKTRACE ---");
                Console.WriteLine(ex.StackTrace);
                Console.WriteLine("--- STACKTRACE ---");
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("Press [enter] to exit.");                
                Console.ReadLine();
                return -1;
            }

        }

        static int TestFunctions()
        {
            Console.WriteLine(" Hit 'S' for sender, or 'R' for receiver, or 'M' for high memory usage, or 'C' for high CPU usage:");
            var key = Console.ReadKey(true).Key;

            if (key == ConsoleKey.S)                
            {
                SendDataToReturnQueue(new QueueData());
                return 0;
            }
            else if(key == ConsoleKey.R)
            {
                return ReceiveFromReturnQueue();
            }
            else if (key == ConsoleKey.M)
            {
                var mu = new MemoryUser(10000000);
                var memory = GC.GetTotalMemory(true)/1024/1024;
                Console.WriteLine($"Memory used: {memory} MB");
                Console.WriteLine(" Press [enter] to exit.");
                Console.ReadLine();
                return 0;
            }
            else if (key == ConsoleKey.C)
            {
                var cu = new CPUtimeUser(5, Environment.ProcessorCount);
                var cpuCounter = new System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", "_Total", true);
                cpuCounter.NextValue();
                cu.StartStressCPU();
                var cpuUsagePercent = cpuCounter.NextValue();
                Console.WriteLine($"CPU used: {cpuUsagePercent} %");
                Console.WriteLine(" Press [enter] to exit.");
                Console.ReadLine();
                return 0;
            }
            else
            {
                throw new ArgumentException("not supported: " + key);
            }
        }

        static int ReceiveFromReturnQueue()
        {
            //just for testing a consumption => TODO make receiver from node.js pusblisher
            var factory = new ConnectionFactory() { HostName = _hostName };
            using (var connection = factory.CreateConnection())
            using (var channel = connection.CreateModel())
            {
                channel.ExchangeDeclare(exchange: _exchangeName, type: "direct");
                channel.QueueDeclare(_returnQueueName, true,false,false,arguments: null);
                channel.QueueBind(queue: _returnQueueName, exchange: _exchangeName, routingKey: _routingKeyNodeQueue);

                Console.WriteLine(" [*] Waiting for messages.");

                var consumer = new EventingBasicConsumer(channel);
                consumer.Received += (model, ea) =>
                {
                    var body = ea.Body;
                    var message = Encoding.UTF8.GetString(body);
                    var routingKey = ea.RoutingKey;
                    Console.WriteLine(" [x] Received '{0}':'{1}'", routingKey, message);
                };
                channel.BasicConsume(queue: _returnQueueName, autoAck: true, consumer: consumer);

                Console.WriteLine(" Press [enter] to exit.");
                Console.ReadLine();
                return 0;
            }
        }

        static int ReceiveFromNodeJS()
        {
            var factory = new ConnectionFactory() { HostName = _hostName };
            using (var connection = factory.CreateConnection())
            using (var channel = connection.CreateModel())
            {
                channel.ExchangeDeclare(exchange: _exchangeName, type: "direct");
                channel.QueueDeclare(_nodejsQueueName, true, false, false, arguments: null);
                channel.QueueBind(queue: _nodejsQueueName, exchange: _exchangeName, routingKey: _routingKeyNodeQueue);

                Console.WriteLine($"Waiting for messages from {_exchangeName} in queue {_nodejsQueueName} ...");

                var consumer = new EventingBasicConsumer(channel);
                consumer.Received += (model, ea) =>
                {
                    var body = ea.Body;
                    var message = Encoding.UTF8.GetString(body);
                    var routingKey = ea.RoutingKey;
                    Console.ForegroundColor = ConsoleColor.DarkGreen;
                    Console.WriteLine($"Received '{routingKey}': '{message}'");

                    QueueData qd = GetObjectFromJSONstring(message);

                    var mu = new MemoryUser(10000000);
                    qd.consumerRAMused = GC.GetTotalMemory(true) / 1024 / 1024;
                    SendDataToReturnQueue(qd);
                };

                channel.BasicConsume(queue: _nodejsQueueName, autoAck: true, consumer: consumer);
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("Press [enter] to exit.");
                Console.ReadLine();
            }
            Console.ForegroundColor = ConsoleColor.White;
            Console.WriteLine("Exit");
            return 0;
        }

        /// <summary>
        /// http://localhost:15672/#/exchanges/%2F/ServermonExchange
        /// http://localhost:15672/#/queues/%2F/ConsumerReturnQueue
        /// </summary>
        static void SendDataToReturnQueue(QueueData qd)
        {
            var factory = new ConnectionFactory() { HostName = _hostName };

            using (var connection = factory.CreateConnection())
            using (var channel = connection.CreateModel())
            {
                channel.ExchangeDeclare(exchange: _exchangeName, type: "direct");
                channel.QueueDeclare(queue: _returnQueueName, durable: true, exclusive: false, autoDelete: false, arguments: null);
                channel.QueueBind(queue: _returnQueueName, exchange: _exchangeName, routingKey: _routingKeyReturnQueue);

                var jsonString = GetJSONstring(qd);
                var payload = Encoding.UTF8.GetBytes(jsonString); 

                channel.BasicPublish(exchange: _exchangeName, routingKey: _routingKeyReturnQueue, basicProperties: null, body: payload);
                Console.WriteLine($"Sent '{jsonString}' to exchange: {_exchangeName}, to queue: {_returnQueueName}");
                Console.ForegroundColor = ConsoleColor.White;
                Console.WriteLine("Press [enter] to exit.");
            }
        }

        private static String GetJSONstring(QueueData qd)
        {
            MemoryStream jsonStream = new MemoryStream();
            DataContractJsonSerializer jsonSer = new DataContractJsonSerializer(typeof(QueueData));
            String returnValue = "";
            try
            {                
                jsonSer.WriteObject(jsonStream, qd);
                jsonStream.Position = 0;
                returnValue = new StreamReader(jsonStream).ReadToEnd();
            }
            catch(Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"ERROR in {nameof(GetJSONstring)}: " + ex.StackTrace);
                returnValue = "";
            }
            finally
            {
                jsonStream.Close();
            }
            return returnValue;
        }

        private static QueueData GetObjectFromJSONstring(string json)
        {
            QueueData qd = new QueueData();
            MemoryStream jsonStream = new MemoryStream(Encoding.UTF8.GetBytes(json));
            try
            {
                DataContractJsonSerializer ser = new DataContractJsonSerializer(qd.GetType());
                qd = ser.ReadObject(jsonStream) as QueueData;
            }
            catch(Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"ERROR in {nameof(GetObjectFromJSONstring)}: " + ex.StackTrace);
            }
            finally
            {
                jsonStream.Close();
            }            
            return qd;
        }

    }

    [DataContract]
    internal class QueueData
    {
        [DataMember(Order = 1)]
        internal string fromGUID;

        [DataMember(Order = 2)]
        internal string type;

        [DataMember(Order = 3)]
        internal string clientTime;

        [DataMember(Order = 4)]
        internal long counter;

        [DataMember(Order = 5)]
        internal string nodejsTimeStart;

        [DataMember(Order = 6)]
        internal double nodejsRAMused;

        [DataMember(Order = 7)]
        internal double nodejsCPUusage;

        [DataMember(Order = 8)]
        internal long consumerRAMused;
    }
}
