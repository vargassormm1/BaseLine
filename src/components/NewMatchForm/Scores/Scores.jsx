import { useState, useEffect } from "react";
import { Form, Checkbox, InputNumber } from "antd";
import styles from "./Scores.module.css";

const Scores = ({ bestOf, playerOne, playerTwo }) => {
  const [tieBreakers, setTieBreakers] = useState({});

  // Initialize or update tie breaker states based on bestOf
  useEffect(() => {
    const initialTieBreakers = {};
    for (let i = 1; i <= bestOf; i++) {
      initialTieBreakers[`set${i}TieBreaker`] = false;
    }
    setTieBreakers(initialTieBreakers);
  }, [bestOf]);

  const handleTieBreakerChange = (setNumber, checked) => {
    setTieBreakers((prev) => ({ ...prev, [setNumber]: checked }));
  };

  return (
    <>
      {Object.keys(tieBreakers).map((tieBreakerKey, index) => {
        const setNumber = index + 1;
        return (
          <div key={tieBreakerKey}>
            <h3>Set {setNumber}</h3>
            <Checkbox
              checked={tieBreakers[tieBreakerKey]}
              onChange={(e) =>
                handleTieBreakerChange(tieBreakerKey, e.target.checked)
              }
            >
              Tiebreaker
            </Checkbox>
            <div className={styles.scores}>
              <Form.Item
                className={styles.scoreInput}
                layout="horizontal"
                name={`playerOneSet${setNumber}Score`}
                label={`Player 1 (${playerOne})`}
                rules={[
                  { required: true, message: "Please input player 1 score" },
                ]}
              >
                <InputNumber min={0} className={styles.scoreInput} />
              </Form.Item>
              {tieBreakers[tieBreakerKey] ? (
                <Form.Item
                  className={styles.scoreInput}
                  label={`Tiebreaker (${playerOne})`}
                  name={`playerOneSet${setNumber}TieBreakerScore`}
                >
                  <InputNumber
                    disabled={!tieBreakers[tieBreakerKey]}
                    min={0}
                    className={styles.scoreInput}
                  />
                </Form.Item>
              ) : (
                <></>
              )}

              <Form.Item
                className={styles.scoreInput}
                name={`playerTwoSet${setNumber}Score`}
                label={`Player 2 (${playerTwo})`}
                rules={[
                  { required: true, message: "Please input player 2 score" },
                ]}
              >
                <InputNumber min={0} className={styles.scoreInput} />
              </Form.Item>
              {tieBreakers[tieBreakerKey] ? (
                <Form.Item
                  className={styles.scoreInput}
                  label={`Tiebreaker (${playerTwo})`}
                  name={`playerTwoSet${setNumber}TieBreakerScore`}
                >
                  <InputNumber
                    disabled={!tieBreakers[tieBreakerKey]}
                    min={0}
                    className={styles.scoreInput}
                  />
                </Form.Item>
              ) : (
                <></>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default Scores;
