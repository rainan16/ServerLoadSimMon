package org.se.lab;

import java.sql.Connection;
import java.sql.SQLException;

public class UserDAOTest {
    private int numberIterations = 10;

    private static final JdbcHelper JDBC_HELPER = new JdbcHelper("src/main/resources/jdbc.properties");
    private Connection connection = null;

    public UserDAOTest(int numberIterations) {
        int offset = 100;
        this.numberIterations = numberIterations * offset;
    }

    public long ProduceDBload()  {
        try {
            long startTime = System.currentTimeMillis();
            setup();

            JDBC_HELPER.executeSqlScript("src/main/resources/sql/createUserTable.sql");
            for(int i= 0; i < numberIterations; i++) {
                JDBC_HELPER.executeSqlScript("src/main/resources/sql/insertUserTable.sql");
            }
            JDBC_HELPER.executeSqlScript("src/main/resources/sql/dropUserTable.sql");

            teardown();
            long endTime = System.currentTimeMillis();
            return endTime-startTime;
        }
        catch (Exception ex) {
            ex.printStackTrace();
            return 0;
        }
    }

    private void setup() throws ClassNotFoundException, SQLException
    {
        connection = JDBC_HELPER.getConnection();
        JDBC_HELPER.txBegin(connection);
    }

    private void teardown() throws SQLException
    {
        JDBC_HELPER.txRollback(connection);
        connection.close();
    }
}
