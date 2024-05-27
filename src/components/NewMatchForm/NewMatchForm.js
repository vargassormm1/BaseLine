import { useState } from "react";
import { Form, Modal, Select, InputNumber } from "antd";
import Scores from "./Scores/Scores";
import { createNewMatch, createNewMatchDetails } from "@/utils/api";
import styles from "./NewmatchForm.module.css";
import { PlusCircleOutlined } from "@ant-design/icons";

const NewMatchForm = ({ currentUser, refetchMatches, users }) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [bestOf, setBestOf] = useState(null);
  const [sets, setSets] = useState(null);
  const [open, setOpen] = useState(false);
  const [playerTwo, setPlayerTwo] = useState(null);

  const showModal = () => {
    setOpen(true);
  };

  const handleCancel = () => {
    form.resetFields();
    setOpen(false);
    setBestOf(null);
    setSets(null);
    setPlayerTwo(null);
  };

  const calculateWinner = (scores, playerTwoId) => {
    let playerOneWins = 0;
    let playerTwoWins = 0;

    scores.forEach((set) => {
      if (set.playeronescore > set.playertwoscore) {
        playerOneWins++;
      } else {
        playerTwoWins++;
      }
    });

    if (bestOf === 1) {
      return playerOneWins > playerTwoWins ? currentUser.userId : playerTwoId;
    }

    const requiredWins = Math.ceil(bestOf / 2);

    return playerOneWins >= requiredWins ? currentUser.userId : playerTwoId;
  };

  const handleSubmit = async (values) => {
    values.playerOne = currentUser.userId;
    values.playerOneUsername = currentUser.username;
    values.playerTwoUsername = player2?.username;

    const playerTwoId = users.find(
      (user) => user.username === player2?.username
    )?.userId;
    const scoresBySet = {};
    const scoresArray = [];

    Object.keys(values).forEach((key) => {
      const match = key.match(
        /(playerOne|playerTwo)(Set\d+)(Score|TieBreakerScore)/
      );
      if (match) {
        const [_, player, set, scoreType] = match;
        if (!scoresBySet[set])
          scoresBySet[set] = {
            set: parseInt(set.replace("Set", "")),
          };
        scoresBySet[set][`${player.toLowerCase()}${scoreType}`] = values[key];
      }
    });

    Object.keys(scoresBySet).forEach((set) => {
      scoresArray.push({
        playeronescore: scoresBySet[set].playeroneScore,
        playertwoscore: scoresBySet[set].playertwoScore,
      });
    });

    const winner = calculateWinner(scoresArray, playerTwoId);
    const newMatch = await createNewMatch({
      ...values,
      winner,
    });

    for (let prop in scoresBySet) {
      await createNewMatchDetails({
        ...scoresBySet[prop],
        matchId: newMatch.matchId,
      });
    }

    await refetchMatches();
    form.resetFields();
    setOpen(false);
    setBestOf(null);
    setSets(null);
    setPlayerTwo(null);
  };

  const filterOpponents = (input, option) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  const player2 = users.find((el) => playerTwo === el.userId);

  return (
    <>
      <button onClick={showModal} className={styles.newGame}>
        <PlusCircleOutlined /> New Match
      </button>
      <Modal
        open={open}
        confirmLoading={confirmLoading}
        footer={null}
        onCancel={handleCancel}
      >
        <Form
          layout="vertical"
          onFinish={handleSubmit}
          form={form}
          initialValues={{ playerOne: currentUser.username }}
          className={styles.newMatchForm}
        >
          <h2 className={styles.scores}>New Match</h2>

          {/* Player 1 */}
          <Form.Item label="Player 1" name="playerOne">
            <Select disabled showSearch optionFilterProp="children" />
          </Form.Item>

          {/* Player 2 */}
          <Form.Item
            label="Player 2"
            name="playerTwo"
            rules={[
              {
                required: true,
                message: "Please select your opponent's username",
              },
            ]}
          >
            <Select
              placeholder="Select Opponent"
              onChange={(value) => setPlayerTwo(value)}
            >
              {users.map((user, id) => {
                return (
                  <Select.Option key={id} value={user.userId}>
                    {user.username}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>

          {/* Match Type */}
          <Form.Item
            name="matchType"
            label="Match Type"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              onChange={(value) => {
                if (value === 1) {
                  setBestOf(parseInt(value));
                  setSets(1);
                } else {
                  setBestOf(parseInt(value));
                  setSets(null);
                }
              }}
            >
              <Select.Option value="1">Best of 1</Select.Option>
              <Select.Option value="3">Best of 3</Select.Option>
              <Select.Option value="5">Best of 5</Select.Option>
            </Select>
          </Form.Item>

          {bestOf && bestOf !== 1 ? (
            <Form.Item
              name="sets"
              label="# of Sets"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <InputNumber
                min={bestOf === 3 ? 2 : 3}
                max={bestOf === 3 ? 3 : 5}
                onChange={(value) => setSets(value)}
              />
            </Form.Item>
          ) : null}

          {player2 && matchType ? (
            <Scores
              bestOf={bestOf === 1 ? 1 : sets}
              playerOne={currentUser.username}
              playerTwo={player2?.username}
            />
          ) : (
            <></>
          )}

          {/* Submit */}
          <button htmlType="submit">Submit</button>
        </Form>
      </Modal>
    </>
  );
};

export default NewMatchForm;
