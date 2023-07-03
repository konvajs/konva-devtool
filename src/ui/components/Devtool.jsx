import React, { useState, useEffect } from 'react';
import { Empty } from 'antd';
import { countTree } from '../utils';
import HeadBar from './HeadBar';
import Tree from './Tree';

const Devtool = (props) => {
  const { data: initData = [], actions = {} } = props;
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedData, setSelectedData] = useState(initData[0]);
  const [selectedHash, setSelectedHash] = useState(initData[0]?.hash ?? '');
  const [data, setData] = useState(initData);

  useEffect(() => {
    return () => {
      actions.cleanAllRect();
    };
  }, [actions, selectedHash]);

  useEffect(() => {
    const target = data.find((e) => e.hash === selectedHash);
    countTree(target);
    setSelectedData(target);
  }, [selectedHash, data]);

  useEffect(() => {
    const handler = (message) => {
      if (message.type === 'showShape') {
        const { hash, key } = message.detail;
        setSelectedHash(hash);
        setSelectedKey(key);
      }
    };
    chrome.runtime.onMessage.addListener(handler);

    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  return (
    <div>
      <HeadBar
        data={data}
        setSelectedHash={setSelectedHash}
        selectedData={selectedData}
        selectedHash={selectedHash}
        actions={actions}
        setData={setData}
      />
      <div
        style={{
          marginTop: 48,
          position: 'relative',
          zIndex: 1
        }}
      >
        {selectedData
          ? (
          <Tree actions={actions} data={selectedData} defaultKey={selectedKey} />
            )
          : (
          <Empty />
            )}
      </div>
    </div>
  );
};

export default Devtool;
