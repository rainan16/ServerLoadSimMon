using System;

namespace RabbitMQ_NetConsumer
{
    internal class MemoryUser
    {
        private DateTime[] values;

        public MemoryUser(int numberOfEntries)
        {
            this.values = new DateTime[numberOfEntries];
        }

        DateTime[] Values { get => values; set => values = value; }
    }
}
